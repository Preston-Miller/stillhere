"""Small, inspectable session state for retrieval. Never stores model prose as evidence."""
import re

TOPICS=[
 ('generator',r'\b(generator|generators|carbon monoxide|co alarm)\b'),
 ('water',r'\b(water|potable|purif\w*|boil\w*|bleach|chlorine|iodine)\b'),
 ('food',r'\b(food|fridge|refrigerat\w*|freezer|cook\w*|canning|pressure[ -]can\w*)\b'),
 ('sanitation',r'\b(toilet|sewage|septic|sanitation)\b'),
 ('tornado',r'\btornado\w*\b'),('wildfire',r'\b(wildfire|smoke)\b'),
 ('radiation',r'\b(radiation|radioactive|fallout)\b')]
class ConversationState:
 def __init__(self):self.reset()
 def reset(self):
  self.topic=None;self.target=None;self.water_condition=None;self.unavailable=set();self.turn=0
 def update(self,question):
  q=question.lower().replace('’',"'")
  # Clinical wording is still checked by retrieve.py; this state cannot authorize clinical records.
  detected=next((topic for topic,pattern in TOPICS if re.search(pattern,q)),None)
  # 'Drinking water' should not be reclassified as a generator topic just because previous evidence mentioned one.
  if detected and detected!=self.topic:
   self.reset();self.topic=detected
  self.turn+=1
  if self.topic=='water':
   if re.search(r'\b(drink\w*|potable|purif\w*)\b',q):self.target='drinking_water'
   if re.search(r'\bcloudy\b',q):self.water_condition='cloudy'
   elif re.search(r'\bclear water\b',q):self.water_condition='clear'
   if re.search(r'\b(surface|countertop|floor|disinfect.*surface)\b',q):self.target='surface'
   elif re.search(r'\b(empty.*container|saniti[sz].*container|container.*saniti[sz])\b',q):self.target='container'
   elif self.target is None and re.search(r'\bwater\b',q) and not re.search(r'\b(clean|wash|toilet)\b',q):self.target='drinking_water'
   negatives={
    'bleach':r"\b(no|without)\s+(?:any\s+)?bleach\b|\b(?:don't|do not|doesn't|cannot|can't)\s+(?:have|use|get)\s+(?:any\s+)?bleach\b|\bout of bleach\b",
    'boiling':r"\b(?:can't|cannot|unable to)\s+boil\b|\bno\s+(?:fuel|heat|stove|pot)\b|\bwithout\s+(?:fuel|heat|stove)\b",
    'filter':r"\bno\s+(?:water\s+)?filter\b|\b(?:don't|do not)\s+have\s+(?:a\s+)?filter\b",
    'tablets':r"\bno\s+(?:treatment\s+)?tablets\b|\b(?:don't|do not)\s+have\s+(?:any\s+)?tablets\b"}
   for method,pattern in negatives.items():
    if re.search(pattern,q):self.unavailable.add(method)
   # Availability changes must be explicit; merely mentioning a method doesn't erase a constraint.
   for method,noun in [('bleach','bleach'),('filter','filter'),('tablets','tablets'),('boiling','stove|fuel|heat')]:
    if re.search(r'\b(?:now have|found|got)\s+(?:some |a |the )?(?:'+noun+r')\b',q):self.unavailable.discard(method)
  return self
 def snapshot(self):
  return {'topic':self.topic,'target':self.target,'water_condition':self.water_condition,'unavailable_methods':sorted(self.unavailable),'turn':self.turn}
 def retrieval_query(self,question):
  # Add structured user context, not previous answers or a concatenation of earlier lexical queries.
  terms=[question]
  if self.topic=='water':
   terms.append({'drinking_water':'drinking water','container':'empty water container sanitization','surface':'surface disinfection'}.get(self.target,''))
  elif self.topic:terms.append(self.topic)
  return ' '.join(terms)
