# How to contribute with LaraDumps

Thank you for your interesting in contributing with LaraDumps.

If you have any questions, do not hesitate to reach the community in the repository [Discussions](https://github.com/laradumps/laradumps/discussions) tab.

> You can fix a bug or even submit a feature. Note that sometimes it will be necessary to send a PR to both repositories

* App - https://github.com/laradumps/laradumps

## Steps

1 .**Fork**

```shell
git clone https://github.com/laradumps/app.git && cd app
```

Install all dependencies with composer and NPM.

```shell
yarn
```

<br/>

2. **Create a new branch**

Create a new branch specifying `feature`, `fix`, `enhancement`.

```shell
git checkout -b feature/my-new-feature
```

<br/>

3. **Code and check your work**

Write your code and, when you are done, run the CS Fix:

```Shell
yarn run fix
```

<br/>

4. **Build Assets**

If you have updated or added JavaScript code, you need to recompile the assets and include it in your commit.

```Shell
yarn run prod
```

<br/>

5**Commit**

Please send clean and descriptive commits.

<br/>


6**Pull Request**

Open a Pull Request (PR) detailing your changes and motivations. Please make only one change per Pull Request.

If you never wrote a PR before, see this excellent [example](https://github.com/Power-Components/livewire-powergrid/pull/149) by [@vs0uz4](https://github.com/vs0uz4) for inspiration.

<br/>

💓  Thank you for contributing!
