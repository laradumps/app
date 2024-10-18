#!/bin/bash

echo 'owner: laradumps
repo: app
provider: github' > app-update.yml

echo 'owner: laradumps
repo: app
provider: github' > dev-app-update.yml

echo 'appId: com.laradumps.app
publish:
  provider: github' > electron-builder.yml
