; Inno Setup script for Stillhere on Windows. Built by windows\build.ps1, which passes the defines below.
; Installs for the current user only (no admin prompt) into %LOCALAPPDATA%\Programs\Stillhere.
; The person's data (AI models, chats, maps) lives in %LOCALAPPDATA%\Stillhere and is kept on uninstall.

#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif

[Setup]
AppId={{6F0B3E52-6C1E-4C8E-9C59-5B2B1D7A2E11}
AppName=stillhere
AppVersion={#MyAppVersion}
AppPublisher=stillhere
AppPublisherURL=https://www.stillhereoffline.com
AppSupportURL=https://www.stillhereoffline.com/install
DefaultDirName={localappdata}\Programs\Stillhere
DefaultGroupName=stillhere
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir={#OutDir}
OutputBaseFilename=Stillhere-Setup-{#MyAppVersion}
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\Stillhere.exe
Compression=lzma2/max
SolidCompression=yes
LZMANumBlockThreads=4
WizardStyle=modern
CloseApplications=yes

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\stillhere"; Filename: "{app}\Stillhere.exe"
Name: "{autodesktop}\stillhere"; Filename: "{app}\Stillhere.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Stillhere.exe"; Description: "Open stillhere"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop a running copy so its files can be removed.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /T /IM Stillhere.exe"; Flags: runhidden; RunOnceId: "StopStillhere"
