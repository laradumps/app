<p align="center">
  <img src="./build/icon.png" height="128" alt="" />
</p>
<h1 align="center">LaraDumps</h1>
<div align="center">
  <br />
    <!--LaraDumpsVersion-->
  <p align="center">
    <a href="https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-Setup-2.1.1.exe">
      <img src="./art/os/windows.png" height="60" alt="LaraDumps Windows App" />
    </a>
    <a href="https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-2.1.1-universal.dmg">
      <img src="./art/os/macos.png" height="60" alt="LaraDumps MacOS App" />
    </a>
    <a href="https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-2.1.1.AppImage">
      <img src="./art/os/linux.png" height="60" alt="LaraDumps Linux App" />
    </a>
  </p>
    <!--EndOfLaraDumpsVersion-->
  <h3>Click to Download the App</h3>
  <sub>Available for Windows, Linux and macOS.</sub>
  <br />
  <br />
  <p>
    <a href="https://laradumps.dev"> 📚 Documentation </a>
  </p>
</div>
 <br/>
<div align="center">
  <p align="center">
    <a href="https://github.com/laradumps/app/releases/latest">
    <img src="https://badgen.net/github/release/laradumps/app" alt="Latest release">
  </a>
  <a href="https://github.com/laradumps/app/releases">
    <img src="https://img.shields.io/github/downloads/laradumps/app/total" alt="Total">
  </a>
</div>
  </p>
</div>

### 👋 Hello Dev,

<br/>

LaraDumps is a friendly app designed to boost your [Laravel](https://larvel.com/) PHP coding and debugging experience.

When using LaraDumps, you can see the result of your debug displayed in a standalone Desktop application.

<br>

### Get Started
<!--LaraDumpsVersion-->

1. Download the Desktop App here: [Windows](https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-Setup-2.1.1.exe) | [MacOS](https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-2.1.1-universal.dmg)
 | [Linux](https://github.com/laradumps/app/releases/download/v2.1.1/LaraDumps-2.1.1.AppImage)
<!--EndOfLaraDumpsVersion-->

2. Install the [LaraDumps package](https://github.com/laradumps/laradumps) in your Laravel project.

3. Debug your code using `ds()` in the same way you would use Laravel's native functions dump() or dd().

<br>

### Example

Here's an example:

```php
// File: routes/web.php

<?php 

Route::get('/', function () {
    ds('Home page accessed!');
    return view('home');
});
```

The Desktop App receives:

<p align="center">
  <img src="./art/example.png" height="500" alt="" />
</p>

### Credits

LaraDumps is a free open-source project, and it was inspired by [Spatie Ray](https://github.com/spatie/ray), check it out!

- Author: [Luan Freitas](https://github.com/luanfreitasdev)

- Logo by [Vitor S. Rodrigues](https://github.com/vs0uz4)
