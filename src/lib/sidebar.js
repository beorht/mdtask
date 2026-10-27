const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const {
  getAssignments,
  getSubmissions,
  getSqlExercises,
  getSolvedSqlExerciseIds,
  getDistinctStudentGroups,
  getLanguageExercises,
} = require('../db');
const { getTopicsForUser, groupBySection } = require('./sql-topics');
const { hasFullAccess, seesSharedAssignments } = require('./test-access');
const { LANGUAGE_SUBJECTS, COURSE_SUBJECTS } = require('./subjects');
const { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, ibTasksForUser } = require('./ib-tasks');
const htmlCourse = require('./html-course');
const cssCourse = require('./css-course');
const pythonCourse = require('./python-course');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

// `subject` scopes the tree to one subject ('sql' | 'python' | 'javascript' | 'ib'); without it the
// full combined tree is returned (all sections + teacher group categories + SQL trainer).
function buildSidebarTree({ role, studentId, studentGroup, subject }) {
  const TOPICS = getTopicsForUser({ role, group: studentGroup });
  const fullAccess = hasFullAccess({ role, group: studentGroup });
  const summaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const tree = parseSummary(summaryText);
  const assignments = getAssignments();
  const submissions = studentId
    ? getSubmissions().filter((s) => s.studentId === studentId)
    : [];

  function attach(nodes) {
    return nodes
      .map((node) => {
        const assignment = assignments.find((a) => a.mdPath === node.path);

        if (
          role === 'student' &&
          assignment &&
          assignment.targetType === 'individual' &&
          assignment.targetStudentId !== studentId
        ) {
          return null;
        }

        if (
          role === 'student' &&
          assignment &&
          assignment.targetType === 'group' &&
          (assignment.targetGroup ? assignment.targetGroup !== studentGroup : !seesSharedAssignments(studentGroup)) &&
          !fullAccess
        ) {
          return null;
        }

        let status = null;
        if (role === 'student' && assignment) {
          const related = submissions.filter((s) => s.assignmentId === assignment.id);
          status = related.length ? related[related.length - 1].status : 'not_submitted';
        }

        return {
          title: node.title,
          path: node.path,
          assignmentId: assignment ? assignment.id : null,
          subject: assignment ? assignment.subject || null : null,
          status,
          children: attach(node.children),
        };
      })
      .filter(Boolean);
  }

  let solvedIds = null;
  let exercisesByTopic = null;
  let prevTopicSolved = true;
  if (role === 'student') {
    solvedIds = getSolvedSqlExerciseIds(studentId);
    const exercises = getSqlExercises();
    exercisesByTopic = {};
    TOPICS.forEach((topic) => {
      exercisesByTopic[topic.key] = exercises.filter((e) => e.topic === topic.key);
    });
  }

  const topicChildren = TOPICS.map((topic) => {
    const children = [
      { title: 'Теор. мат.', href: `/trainer/theory/${topic.key}`, children: [] },
    ];

    if (role === 'student') {
      const topicExercises = exercisesByTopic[topic.key];
      const total = topicExercises.length;
      const solved = topicExercises.filter((e) => solvedIds.has(e.id)).length;

      // Theory-only topics (no exercises yet) have nothing to practice or lock —
      // skip the practice link and leave the unlock chain untouched.
      if (total > 0) {
        let navStatus = 'not_started';
        if (!prevTopicSolved && !fullAccess) navStatus = 'locked';
        else if (solved === total) navStatus = 'done';
        else if (solved > 0) navStatus = 'current';
        prevTopicSolved = prevTopicSolved && solved === total;

        children.push({ title: 'Прак. мат.', href: `/trainer/practice/${topic.key}`, navStatus, children: [] });
      }
    }

    return { title: topic.label, href: null, children };
  });

  if (role === 'teacher') {
    topicChildren.push({ title: 'Результаты тренажёра', href: '/admin/trainer/results', children: [] });
  }

  const trainerSection = {
    title: 'SQL DataBase',
    href: null,
    children: topicChildren,
  };

  const groupCategories = [];
  if (role === 'teacher') {
    const groups = getDistinctStudentGroups();
    for (const group of groups) {
      const children = assignments
        .filter((a) => a.targetType === 'group' && (a.targetGroup === group || (!a.targetGroup && seesSharedAssignments(group))))
        .map((a) => ({ title: a.title, assignmentId: a.id, children: [] }));
      if (children.length > 0) {
        groupCategories.push({ title: `Группа ${group}`, href: null, children });
      }
    }
  }

  // ---------- subject-scoped navigation ----------
  // Nodes carry a `kind` the sidebar partial renders specially:
  //   back    — "← Все предметы" link;
  //   header  — subject card: icon, title, progress (done / total);
  //   section — labelled block, optionally with a filter box;
  //   group   — collapsible topic/section: status icon, title, counter; opens when it holds the
  //             active page or is the student's current topic;
  //   link    — leaf link with an icon, optional counter / status badge / locked state.
  if (subject === 'sql') return sqlSubjectNav();
  if (subject === 'python' && role === 'student' && pythonCourse.canSeeCourse({ role, group: studentGroup })) return pythonWithCourseNav();
  if (LANGUAGE_SUBJECTS[subject]) return languageSubjectNav(subject);
  if (subject === IB_SUBJECT_KEY) return ibSubjectNav();
  if (subject === htmlCourse.HTML_KEY) return htmlCourseNav();
  if (subject === cssCourse.CSS_KEY) return htmlCourseNav(cssCourse);
  if (subject === 'python-course') return pythonCourseNav();
  if (COURSE_SUBJECTS[subject]) return courseSubjectNav(COURSE_SUBJECTS[subject]);

  function backLink() {
    return role === 'teacher'
      ? { kind: 'back', title: 'Админ-панель', href: '/admin', children: [] }
      : { kind: 'back', title: 'Все предметы', href: '/', children: [] };
  }

  function sqlSubjectNav() {
    const header = { kind: 'header', icon: '🗄️', title: 'Базы данных (SQL)', href: role === 'student' ? '/subjects/sql' : null, children: [] };

    if (role !== 'student') {
      const theorySections = groupBySection(TOPICS).map((section) => ({
        kind: 'section',
        title: section.key === 'topics' ? 'Теория по темам' : `${section.title}: теория`,
        filter: section.key === 'topics',
        children: section.topics.map((t) => ({ kind: 'link', icon: '📖', title: t.label, href: `/trainer/theory/${t.key}`, children: [] })),
      }));
      return [
        backLink(),
        header,
        ...theorySections,
        { kind: 'section', title: 'Преподавателю', children: [{ kind: 'link', icon: '📊', title: 'Результаты тренажёра', href: '/admin/trainer/results', children: [] }] },
      ];
    }

    let chainOpen = true; // sequential unlock: a topic opens once every earlier one is fully solved
    let currentMarked = false;
    let solvedAll = 0;
    let totalAll = 0;
    const sectionOf = Object.fromEntries(TOPICS.map((t) => [t.key, t.section || 'topics']));
    const numberInSection = {};
    const groups = TOPICS.map((topic) => {
      const list = exercisesByTopic[topic.key];
      const total = list.length;
      const solved = list.filter((e) => solvedIds.has(e.id)).length;
      solvedAll += solved;
      totalAll += total;

      const children = [{ kind: 'link', icon: '📖', title: 'Теория', href: `/trainer/theory/${topic.key}`, children: [] }];
      let status = 'theory';
      if (total > 0) {
        const locked = !chainOpen && !fullAccess;
        if (locked) status = 'locked';
        else if (solved === total) status = 'done';
        else if (!currentMarked) {
          status = 'current';
          currentMarked = true;
        } else status = 'open';
        chainOpen = chainOpen && solved === total;
        children.push({
          kind: 'link',
          icon: locked ? '🔒' : status === 'done' ? '✓' : '🧪',
          title: 'Практика',
          meta: `${solved}/${total}`,
          href: `/trainer/practice/${topic.key}`,
          locked,
          children: [],
        });
      }
      const section = sectionOf[topic.key];
      numberInSection[section] = (numberInSection[section] || 0) + 1;
      return {
        kind: 'group',
        key: topic.key,
        number: numberInSection[section],
        title: topic.label,
        status,
        meta: total > 0 ? `${solved}/${total}` : null,
        open: status === 'current',
        children,
      };
    });

    return [
      backLink(),
      { ...header, done: solvedAll, total: totalAll, label: 'задач решено' },
      ...groupBySection(TOPICS).map((section) => ({
        kind: 'section',
        title: section.title,
        filter: section.key === 'topics',
        children: groups.filter((g) => sectionOf[g.key] === section.key),
      })),
    ];
  }

  // «Web-разработка: HTML»: тема — раскрывающаяся группа «N.1. Теория» и «N.2. Практическая работа».
  // Предметы «Web-разработка: HTML» и «Web-разработка: CSS» — темы «N.1 теория, N.2 практика».
  function htmlCourseNav(lib = htmlCourse) {
    const key = lib === htmlCourse ? htmlCourse.HTML_KEY : cssCourse.CSS_KEY;
    const base = `/subjects/${key}`;
    const { topics, solved, total, current } = lib.summaryForStudent({ id: studentId, role, group: studentGroup });
    return [
      backLink(),
      { kind: 'header', icon: lib === htmlCourse ? htmlCourse.HTML_ICON : cssCourse.CSS_ICON, title: lib === htmlCourse ? htmlCourse.HTML_TITLE : cssCourse.CSS_TITLE, href: base, done: solved, total, label: 'заданий решено', children: [] },
      {
        kind: 'section',
        title: 'Темы',
        children: topics.map((t) => ({
          kind: 'group',
          number: t.number,
          title: t.title,
          status: t.done ? 'done' : t.theoryOpen ? 'open' : 'locked',
          meta: t.ready ? `${t.solved}/${t.total}` : 'скоро',
          open: Boolean(current && current.key === t.key),
          children: t.ready
            ? [
              { kind: 'link', icon: t.theoryRead ? '✓' : '📖', title: `${t.number}.1. Теория`, href: `${base}/${t.key}/theory`, locked: !t.theoryOpen, lockedTitle: 'Откроется после практической работы предыдущей темы', children: [] },
              { kind: 'link', icon: t.done ? '✓' : '🧪', title: `${t.number}.2. Практическая работа`, href: `${base}/${t.key}/practice`, meta: `${t.solved}/${t.total}`, locked: !t.practiceOpen, lockedTitle: 'Откроется после теории темы', children: [] },
            ]
            : [{ kind: 'link', icon: '⏳', title: 'Тема готовится', href: base, locked: true, lockedTitle: 'Материалы темы ещё готовятся', children: [] }],
        })),
      },
    ];
  }

  function ibSubjectNav() {
    const tasks = ibTasksForUser({ id: studentId }).filter((t) => t.assigned);
    const links = tasks.map((t) => {
      const practice = `/subjects/${IB_SUBJECT_KEY}/${t.key}`;
      if (!t.theory) {
        return { kind: 'link', icon: t.solved ? '✓' : '💻', title: `№${t.number}. ${t.title}`, href: practice, children: [] };
      }
      return {
        kind: 'group',
        number: t.number,
        title: t.title,
        status: t.solved ? 'done' : 'open',
        meta: t.solved ? null : `${t.passed}/${t.total}`,
        open: !t.solved,
        children: [
          { kind: 'link', icon: '📖', title: 'Теория', href: `${practice}/theory`, children: [] },
          { kind: 'link', icon: t.solved ? '✓' : '💻', title: 'Практика в терминале', href: practice, children: [] },
        ],
      };
    });
    return [
      backLink(),
      {
        kind: 'header',
        icon: '🛡️',
        title: IB_SUBJECT_TITLE,
        href: `/subjects/${IB_SUBJECT_KEY}`,
        done: tasks.filter((t) => t.solved).length,
        total: tasks.length,
        label: 'заданий выполнено',
        children: [],
      },
      { kind: 'section', title: 'Задания', children: links },
    ];
  }

  // SUMMARY tree → nav groups/links for the assignments of one subject (null = Python/JavaScript).
  // keep(node) — дополнительный отбор заданий (у Python — только задания по Python).
  function assignmentTreeNav(subjectKey, query, keep = () => true) {
    const toNav = (nodes) =>
      nodes
        .map((node) => {
          if (node.assignmentId && ((node.subject || null) !== subjectKey || !keep(node))) return null;
          if (node.assignmentId) {
            return {
              kind: 'link',
              title: node.title,
              href: `/assignment/${node.assignmentId}${query}`,
              assignmentId: node.assignmentId,
              status: node.status,
              children: [],
            };
          }
          const children = toNav(node.children);
          if (!children.length) return null; // SUMMARY entries without an assignment for this student
          const leaves = children.filter((c) => c.assignmentId);
          return {
            kind: 'group',
            title: node.title,
            status: leaves.length && leaves.every((c) => c.status === 'done') ? 'done' : 'open',
            meta: `${leaves.filter((c) => c.status === 'done').length}/${leaves.length}`,
            children,
          };
        })
        .filter(Boolean);

    const assignmentNav = toNav(attach(tree));
    // Open the first section that still has unfinished assignments.
    const firstOpen = assignmentNav.find((n) => n.kind === 'group' && n.status !== 'done');
    if (firstOpen) firstOpen.open = true;
    const allLeaves = [];
    (function walk(nodes) {
      nodes.forEach((n) => (n.assignmentId ? allLeaves.push(n) : walk(n.children)));
    })(assignmentNav);
    return { assignmentNav, allLeaves };
  }

  function courseSubjectNav(course) {
    const { assignmentNav, allLeaves } = assignmentTreeNav(course.key, '');
    return [
      backLink(),
      {
        kind: 'header',
        icon: course.icon,
        title: course.title,
        href: `/subjects/${course.key}`,
        done: allLeaves.filter((l) => l.status === 'done').length,
        total: allLeaves.length,
        label: 'заданий принято',
        children: [],
      },
      {
        kind: 'section',
        title: 'Учебные материалы',
        children: course.theory.map((th) => ({
          kind: 'link',
          icon: '📖',
          title: th.title,
          href: `/subjects/${course.key}/theory/${th.slug}`,
          children: [],
        })),
      },
      { kind: 'section', title: 'Задания со сдачей', children: assignmentNav },
    ];
  }

  function languageSubjectNav(language) {
    const keep = language === 'python' ? (node) => pythonCourse.lessonForAssignment(node.path) !== null : undefined;
    const { assignmentNav, allLeaves } = assignmentTreeNav(null, `?subject=${language}`, keep);
    // Python с курсом «Начальный Python»: сначала модули курса, ниже — задания со сдачей и банк.

    const bankGroups = [];
    for (const ex of getLanguageExercises(language)) {
      let topic = bankGroups.find((t) => t.key === ex.topic);
      if (!topic) {
        topic = { kind: 'group', key: ex.topic, title: ex.topicLabel, status: 'bank', children: [] };
        bankGroups.push(topic);
      }
      topic.children.push({ kind: 'link', icon: '📝', title: ex.title, href: `/subjects/${language}/bank/${ex.id}`, children: [] });
    }
    bankGroups.forEach((g) => (g.meta = String(g.children.length)));

    return [
      backLink(),
      {
        kind: 'header',
        icon: language === 'python' ? '🐍' : '🟨',
        title: LANGUAGE_SUBJECTS[language],
        href: `/subjects/${language}`,
        done: allLeaves.filter((l) => l.status === 'done').length,
        total: allLeaves.length,
        label: 'заданий принято',
        children: [],
      },
      { kind: 'section', title: 'Задания со сдачей', children: assignmentNav },
      { kind: 'section', title: 'Банк задач', filter: true, children: bankGroups },
    ];
  }

  // Python с курсом: задания со сдачей по Python стоят в своих уроках (после задач урока). Банка нет — его задачи
  // и задания «Объекты и словари» стали задачами практики уроков (content/python-course/assignments.json).
  function pythonWithCourseNav() {
    const { allLeaves } = assignmentTreeNav(null, '?subject=python', (node) => pythonCourse.lessonForAssignment(node.path) !== null && !pythonCourse.replacedByCourse(node.path));
    const nav = pythonCourseNav();
    const leafPath = new Map();
    (function walk(nodes) {
      nodes.forEach((n) => (n.assignmentId ? leafPath.set(n.assignmentId, n.path) : walk(n.children || [])));
    })(attach(tree));
    for (const leaf of allLeaves) {
      const lesson = pythonCourse.lessonForAssignment(leafPath.get(leaf.assignmentId));
      const group = nav.flatMap((s) => s.children || []).find((g) => g.lessonKey === lesson);
      if (group) group.children.push({ ...leaf, icon: '📎', title: `Сдать: ${leaf.title}` });
    }
    return nav;
  }

  // Курс «Начальный Python»: модуль — раздел, урок — раскрывающаяся группа «N.1. Теория» и «N.2. Практика».
  function pythonCourseNav() {
    const base = pythonCourse.COURSE_BASE;
    const { modules, solved, total, current } = pythonCourse.summaryForStudent({ id: studentId, role, group: studentGroup });
    return [
      backLink(),
      { kind: 'header', icon: '🐍', title: 'Python', href: '/subjects/python', sub: `Курс «${pythonCourse.COURSE_TITLE}»`, done: solved, total, label: 'задач решено', children: [] },
      ...modules.map((m) => ({
        kind: 'section',
        title: `Модуль ${m.number}. ${m.title}`,
        children: m.lessons.map((l) => ({
          kind: 'group',
          lessonKey: l.key,
          number: l.number,
          title: `${l.number}. ${l.title}`,
          status: l.done ? 'done' : l.theoryOpen ? 'open' : 'locked',
          meta: l.ready ? `${l.solved}/${l.total}` : 'скоро',
          open: Boolean(current && current.key === l.key),
          children: l.ready
            ? [
              { kind: 'link', icon: l.theoryRead ? '✓' : '📖', title: 'Теория', href: `${base}/${l.key}/theory`, locked: !l.theoryOpen, lockedTitle: 'Откроется после практики предыдущего урока', children: [] },
              ...l.tasks.map((t) => ({ kind: 'link', icon: t.solved ? '✓' : '🧪', title: `${t.number}. ${t.title}`, href: `${base}/${l.key}/${t.id}`, locked: !l.practiceOpen, lockedTitle: 'Откроется после теории урока', children: [] })),
            ]
            : [{ kind: 'link', icon: '⏳', title: 'Урок готовится', href: base, locked: true, lockedTitle: 'Материалы урока ещё готовятся', children: [] }],
        })),
      })),
    ];
  }

  return [...attach(tree), ...groupCategories, trainerSection];
}

module.exports = { buildSidebarTree };
