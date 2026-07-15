# The Age of Congress

The live average age of the United States Congress — [ageofcongress.com](https://ageofcongress.com).

A static Next.js site. All clocks are client-side math from baked-in birth dates; a daily
GitHub Action re-runs the data pipeline (roster → verification → portraits → history) and
commits the result, which triggers a redeploy.

- Data: [@unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) (CC0)
- Portraits: official congressional photos via [@unitedstates/images](https://github.com/unitedstates/images) (public domain)
- Birth dates of all listed members are cross-checked against Wikidata at build time; uncorroborated dates fail the build
- Population baseline: U.S. Census Bureau NC-EST2025

`npm run pipeline` refreshes data · `npm run dev` serves · `npm test` runs the suite · `npm run build` produces the static export.

Built by [Annas Rahman](https://annasrahman.com).
