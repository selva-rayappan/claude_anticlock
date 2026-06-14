@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "WRAPPER_JAR=%SCRIPT_DIR%gradle\wrapper\gradle-wrapper.jar"
set "WRAPPER_PROPS=%SCRIPT_DIR%gradle\wrapper\gradle-wrapper.properties"

if not exist "%WRAPPER_JAR%" (
    echo ERROR: gradle-wrapper.jar not found at %WRAPPER_JAR%
    exit /b 1
)

if defined JAVA_HOME (
    set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) else (
    set "JAVA_EXE=java"
)

"%JAVA_EXE%" -Xmx64m -Xms64m ^
    "-Dorg.gradle.appname=gradlew" ^
    -classpath "%WRAPPER_JAR%" ^
    org.gradle.wrapper.GradleWrapperMain %*

endlocal
