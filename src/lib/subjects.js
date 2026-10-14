const path = require('path');

// Subjects that get their own section of the student site. Python and JavaScript share the
// file-submission assignments (one task set, solved in either language) and each has its
// own task bank (language_exercises).
const LANGUAGE_SUBJECTS = {
  python: 'Python',
  javascript: 'JavaScript',
};

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');

// Course subjects: their own file-submission assignments (assignments.subject = key, not shown in
// Python/JavaScript) plus theory pages (Markdown under content/<key>/theory/). A student sees the
// subject once at least one of its assignments is visible to them.
const COURSE_SUBJECTS = {
  pis: {
    key: 'pis',
    title: 'Проектирование информационных систем',
    icon: '📐',
    kind: 'Проектирование',
    lead:
      'Как моделировать сервисы, программы, процессы и базы данных: учебные материалы и задания на построение схем. ' +
      'Схемы рисуются в draw.io, MS Office, Paint или от руки и сдаются файлом.',
    theory: [
      {
        slug: 'service-model',
        title: 'Как строить модель сервиса, программы и процесса',
        summary: 'Сервисная модель, функциональная модель IDEF0, схема процесса UML Activity и BPMN.',
        file: path.join(CONTENT_DIR, 'pis', 'theory', 'service-model.md'),
      },
      {
        slug: 'database-schema',
        title: 'Как рисовать схему базы данных',
        summary: 'Сущности, ключи, связи 1:1, 1:M, M:M, ER и UML-классы, нормализация, декомпозиция.',
        file: path.join(CONTENT_DIR, 'pis', 'theory', 'database-schema.md'),
      },
    ],
  },
};

// Default for assignments.upload_types = NULL: a solution archive.
const ARCHIVE_TYPES = ['.zip', '.rar'];
// Diagrams and documents: drawn in draw.io / MS Office / Paint or photographed.
const DIAGRAM_TYPES = ['.png', '.jpg', '.jpeg', '.pdf', '.docx', '.doc', '.pptx', '.vsdx', '.drawio', '.zip', '.rar'];

function uploadTypesOf(assignment) {
  return assignment && assignment.uploadTypes && assignment.uploadTypes.length ? assignment.uploadTypes : ARCHIVE_TYPES;
}

module.exports = { LANGUAGE_SUBJECTS, COURSE_SUBJECTS, ARCHIVE_TYPES, DIAGRAM_TYPES, uploadTypesOf };
