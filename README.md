# Language Learning App

## About

This is a major project for GEAP103. We are working together to create an app that helps people learn a new language. The app's learning activities and features will be planned as the project develops.

## Project goals

- Make language learning approachable and engaging.
- Build the app collaboratively and improve it through feedback.

## Planned features

The first version includes vocabulary practice, English reading and quizzes.

## Team

Created by two GEAP103 students.

## Try Wordwell

Download or clone this repository and open `index.html` in a modern browser. The site has no build step and can also be served as a static site from the repository root.

- The English interface offers B1, B2, C1 and C2 study settings. The vocabulary library contains 7,000 distinct entries, including 200 academic priority words. The selected level affects ordering and can be applied as an exact filter.
- Vocabulary includes English definitions, examples where available, pronunciation through browser speech synthesis, and a mastered-word list. Voice availability depends on the browser and operating system.
- Four original B2–C1 passages each have four multiple-choice questions. Every quiz covers inference, author stance and critical thinking. Submission displays a score and explanations in English.
- The selected level, mastered words and latest result are saved in the same browser. No sign-in or backend is required.

### Data sources

- The suggested vocabulary bands in `data/levels.js` use corpus exposure from [EFLLex](https://cental.uclouvain.be/cefrlex/efllex/) (Dürlich & François, LREC 2018), with editorial overrides and a supplemental C2 list. The bands are learning recommendations and have not been independently CEFR-validated. The EFLLex-derived file is shared under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- `data/dictionary.js` selects definitions and examples from [Wordset](https://github.com/wordset/wordset-dictionary) and includes original revisions for selected academic entries. The file is shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See the [Wordset and WordNet notices](data/WORDSET-LICENSE.txt).
- [Google 10,000 English](https://github.com/first20hours/google-10000-english) provided supplemental candidate ordering where needed.
