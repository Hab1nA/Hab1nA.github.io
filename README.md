# Kaizhou Xie

This repository hosts the personal GitHub Pages site for
[Kaizhou Xie](https://github.com/Hab1nA).

Kaizhou Xie is an undergraduate student at Beihang University, interested in
automated simulation, deep learning architectures, and engineering tools.

## Website

- Homepage: <https://hab1na.github.io/>
- GitHub profile: <https://github.com/Hab1nA>

The root homepage introduces the profile above and links to selected static web
projects in this repository.

## Projects

- [AI Usage Dashboard](./AIUsageDashboard/) - unified dashboard to monitor AI
  API usage across multiple providers (DeepSeek, Mimo, Volcengine, ChatGPT,
  Packycode) with extensible provider architecture.
- [Graduation Map](./GraduationMap/G2020/) - an interactive page for graduation
  memories and shared locations.
- [Rocket Engine Design Review](./RocketEngineDesignReview/) - course material
  and review notes for liquid rocket engine design.

## Repository Structure

```text
.
|-- index.html
|-- AIUsageDashboard/
|   |-- index.html
|   |-- main.js
|   |-- provider-registry.js
|   |-- provider-base.js
|   |-- config.js
|   |-- ui.js
|   |-- test-utils.js
|   |-- providers/
|   |   |-- deepseek.js
|   |   |-- mimo.js
|   |   |-- volcengine.js
|   |   |-- chatgpt.js
|   |   `-- packycode.js
|   `-- docs/
|       `-- interface.md
|-- GraduationMap/
|   `-- G2020/
|-- RocketEngineDesignReview/
`-- README.md
```

This site is intentionally lightweight: it uses static HTML and Markdown only,
so it can be served directly by GitHub Pages without a build step.
