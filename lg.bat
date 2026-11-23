@echo off
rem litegraph launcher (Windows cmd and PowerShell): runs tools\lg\lg.mjs on Bun, else Node.
rem LG_RUNTIME=bun or node picks one explicitly. "lg help" lists the commands.
setlocal
set "LG_HELPER=%~dp0tools\lg\lg.mjs"
if /i "%LG_RUNTIME%"=="bun" goto try_bun
if /i "%LG_RUNTIME%"=="node" goto try_node
if not "%LG_RUNTIME%"=="" goto bad_runtime

:try_bun
where bun >nul 2>nul || goto bun_missing
bun "%LG_HELPER%" %*
exit /b %ERRORLEVEL%
:bun_missing
if /i "%LG_RUNTIME%"=="bun" goto not_found

:try_node
where node >nul 2>nul || goto not_found
node "%LG_HELPER%" %*
exit /b %ERRORLEVEL%

:bad_runtime
echo lg: LG_RUNTIME must be bun or node (got "%LG_RUNTIME%") 1>&2
exit /b 2

:not_found
if not "%LG_RUNTIME%"=="" (echo lg: LG_RUNTIME=%LG_RUNTIME%, but it was not found on PATH. 1>&2) else (echo lg: neither Bun nor Node.js was found on PATH. 1>&2)
echo     Install one of them, then run npm ci (or bun install) in %~dp0: 1>&2
echo       Bun:     https://bun.sh 1>&2
echo       Node.js: https://nodejs.org (version 18 or newer) 1>&2
exit /b 127
