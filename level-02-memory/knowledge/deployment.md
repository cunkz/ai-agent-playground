# Deployment

This project has no production deployment. It is a local learning
playground, intended to run on a single developer's own machine. There is
no cloud hosting, no container image built for the Node.js application
itself, and no CI/CD pipeline of any kind. The only thing that runs in
Docker is the PostgreSQL database used by Level 2; the Node.js/TypeScript
code that makes up the agent itself runs directly on the host machine via
npm scripts and tsx, with no build or packaging step.

Running the project requires Node.js (an LTS version), npm, and Docker
Desktop (only from Level 2 onward, since Level 0 and Level 1 need no
database at all). A developer clones the repository, runs npm install,
copies .env.example to .env and fills in their own API keys and database
connection string, and then runs the relevant npm script for whichever
level they are working on, such as npm run level0, npm run level1, or
npm run level2.

There is no staging environment and no separate production environment.
Configuration differences between a developer's machines would be handled
entirely through different local .env files, since .env is explicitly
excluded from version control and only .env.example (with blank values)
is committed.

If this project were ever taken toward production use, later levels of
the curriculum are expected to introduce process supervision, containerized
deployment of the application itself, and a real environment separation
strategy, but none of that exists yet at the levels built so far.
