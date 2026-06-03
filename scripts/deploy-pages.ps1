param(
  [ValidateSet('patch', 'minor', 'major')]
  [string]$VersionType = 'patch',

  [string]$Message = '',

  [string]$Remote = 'origin',

  [string]$PagesBranch = 'gh-pages',

  [switch]$Yes,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string[]]$StepArgs
  )

  Write-Host "> $Command $($StepArgs -join ' ')" -ForegroundColor Cyan
  if ($DryRun) { return }

  & $Command @StepArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($StepArgs -join ' ')"
  }
}

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Resolve-Executable {
  param([Parameter(Mandatory = $true)][string]$Name)

  if ($Name -eq 'npm') {
    $npmCmd = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if ($npmCmd) { return $npmCmd.Source }
  }

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Required command not found: $Name"
  }
  return $command.Source
}

$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
  throw 'This script must be run inside a git repository.'
}

Set-Location $repoRoot

Assert-Command git
Assert-Command npm

$git = Resolve-Executable 'git'
$npm = Resolve-Executable 'npm'

$branch = (git branch --show-current).Trim()
if (-not $branch) {
  throw 'Cannot deploy from a detached HEAD.'
}

$remoteUrl = (git remote get-url $Remote).Trim()
if (-not $remoteUrl) {
  throw "Remote not found: $Remote"
}

$beforeStatus = (git status --porcelain)
if (-not $beforeStatus) {
  throw 'No local changes to release. Make a change before deploying.'
}

Write-Host "Deploying from branch: $branch" -ForegroundColor Green
Write-Host "Version bump: $VersionType" -ForegroundColor Green
Write-Host "Remote: $remoteUrl" -ForegroundColor Green
Write-Host 'Changes that will be included in the release commit:' -ForegroundColor Green
git status --short

if ($DryRun) {
  Write-Host 'Dry run only. No files, commits, or remote branches will be changed.' -ForegroundColor Yellow
} elseif (-not $Yes) {
  $answer = Read-Host 'Type DEPLOY to version, commit, push, and update GitHub Pages'
  if ($answer -ne 'DEPLOY') {
    throw 'Deploy cancelled.'
  }
}

Run-Step $npm @('version', $VersionType, '--no-git-tag-version')

$packageJson = Get-Content -Raw (Join-Path $repoRoot 'package.json') | ConvertFrom-Json
$version = [string]$packageJson.version
$releaseMessage = if ($Message) { $Message } else { "Release v$version" }
$deployMessage = "Deploy v$version to GitHub Pages"

Run-Step $npm @('run', 'build:pages')

$tsBuildInfo = Join-Path $repoRoot 'tsconfig.tsbuildinfo'
if ((Test-Path -LiteralPath $tsBuildInfo) -and -not $DryRun) {
  Remove-Item -LiteralPath $tsBuildInfo
}

Run-Step $git @('add', '-A')
Run-Step $git @('commit', '-m', $releaseMessage)
Run-Step $git @('push', $Remote, $branch)

$distPath = Join-Path $repoRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $distPath 'index.html'))) {
  throw 'Expected dist/index.html after build, but it was not found.'
}

$deployPath = Join-Path $env:TEMP 'incremental-idle-gh-pages-deploy'
if ((Test-Path -LiteralPath $deployPath) -and -not $DryRun) {
  Remove-Item -LiteralPath $deployPath -Recurse -Force
}
if (-not $DryRun) {
  New-Item -ItemType Directory -Path $deployPath | Out-Null
  Copy-Item -Path (Join-Path $distPath '*') -Destination $deployPath -Recurse
  New-Item -ItemType File -Path (Join-Path $deployPath '.nojekyll') -Force | Out-Null
}

Run-Step $git @('init', $deployPath)
Run-Step $git @('-C', $deployPath, 'checkout', '-b', $PagesBranch)
Run-Step $git @('-C', $deployPath, 'add', '-A')
Run-Step $git @('-C', $deployPath, 'commit', '-m', $deployMessage)
Run-Step $git @('-C', $deployPath, 'remote', 'add', $Remote, $remoteUrl)
Run-Step $git @('-C', $deployPath, 'push', '-f', $Remote, $PagesBranch)

if ($DryRun) {
  Write-Host "Dry run completed for v$version. No deploy was published." -ForegroundColor Yellow
} else {
  Write-Host "Deployed v$version to GitHub Pages." -ForegroundColor Green
}
