/* ==========================================================================
   terminalCommands.js — every pks-sh command lives here.

   To add a command: add an entry to HELP (optional) and a function to the
   object returned by createCommands(). Each command receives (args, ctx).

   ctx.print(...lines)   line = 'plain text' | [[text, className], …]
   ctx.banner(text)      prints 3D ASCII block letters
   ctx.go(sectionId)     smooth-scrolls to a section

   SECURITY: commands resolve only through this fixed map — no eval(),
   no new Function(), and output is rendered as text by React.
   ========================================================================== */

import { canRender, SUPPORTED } from './ascii.js';
import { PROFILE, SKILLS, PROJECTS, WORKFLOW, THEMES, SECTION_ORDER, LINKS, EXPERIENCE, GITHUB } from '../data/portfolio.js';
import { readCache } from './github.js';

const FILES = ['about.txt', 'skills.txt', 'projects.txt', 'experience.txt'];

export const HELP = [
  ['about', 'go to about'],
  ['skills', 'go to tech stack'],
  ['projects', 'go to projects'],
  ['contact', 'go to contact'],
  ['home', 'back to the top'],
  ['open <section>', 'go to a section'],
  ['whoami', 'show profile'],
  ['ls', 'list sections & files'],
  ['pwd', 'current location'],
  ['cat <file>', 'print a .txt file'],
  ['resume', 'open my résumé (PDF)'],
  ['email', 'my email address'],
  ['links', 'GitHub, LinkedIn, LeetCode …'],
  ['github', 'recently updated repos'],
  ['snake', 'play a quick game'],
  ['banner <text>', '3D ASCII letters'],
  ['render [mode]', 'ascii | vector'],
  ['theme [name]', 'switch colours'],
  ['dock [left|right]', 'move this terminal'],
  ['sound [on|off|test]', 'retro sound effects'],
  ['history', 'previous commands'],
  ['clear', 'clear the screen'],
  ['exit', 'close (or Esc)'],
];

const dim = t => [[t, 't-dim']];
const acc = t => [[t, 't-acc']];
const err = t => [[t, 't-err']];
const hi = t => [[t, 't-hi']];

const aboutText = () => [
  [[PROFILE.name, 't-strong'], [` — ${PROFILE.role}`, 't-acc']],
  dim('Focused on turning ambiguous real-world requirements'),
  dim('into reliable software systems.'),
  '',
  [['workflow  ', 't-dim'], [WORKFLOW.map(w => w.title).join(' → '), 't-vi']],
];
const skillsText = () => [hi('SYSTEM_CAPABILITIES'), ...SKILLS.map(g => [[g.title.padEnd(11), 't-acc'], [g.items.map(i => i.name).join(', '), '']])];
const experienceText = () => [
  hi('EXPERIENCE'),
  ...EXPERIENCE.flatMap(x => [[[`[${x.when}] `.padEnd(11), 't-acc'], [x.title, 't-strong'], [` @ ${x.org}`, 't-dim']], dim(`           ${x.text}`)]),
];
/** a clickable line: [[label, cls, href]] */
const link = (label, href, pre = '') => [[pre, 't-dim'], [label, 't-acc', href]];
const projectsText = () => [
  hi('PROJECT_ARCHIVE'),
  ...PROJECTS.map((p, i) => [[`PRJ_${String(i + 1).padStart(3, '0')}  `, 't-vi'], [p.title.padEnd(16), 't-strong'], [p.tech.join(' · '), 't-dim']]),
  '', dim("type 'projects' or 'open projects' to view them"),
];

export function createCommands() {
  const commands = {
    help: (_, { print }) => {
      print(hi('AVAILABLE COMMANDS'));
      for (const [c, d] of HELP) print([[c.padEnd(20), 't-acc'], [d, 't-dim']]);
      print('', dim('↑/↓ history · Tab complete · Esc close'));
    },
    about: (_, ctx) => { ctx.print(...aboutText()); ctx.go('about'); },
    skills: (_, ctx) => ctx.go('skills'),
    stack: (_, ctx) => ctx.go('skills'),
    projects: (_, ctx) => ctx.go('projects'),
    contact: (_, ctx) => ctx.go('contact'),
    home: (_, ctx) => ctx.go('home'),
    cd: (args, ctx) => {
      const t = (args[0] || '').replace(/^\.?\/?/, '').replace(/\/$/, '').toLowerCase();
      if (!t || t === '~' || t === '..') return ctx.go('home');
      if (SECTION_ORDER.includes(t)) return ctx.go(t);
      ctx.print(err(`cd: no such section: ${args[0]}`));
    },
    open: (args, ctx) => {
      const t = (args[0] || '').toLowerCase().replace(/^\.?\/?/, '');
      if (!t) return ctx.print(err('usage: open <section>'), dim(`sections: ${SECTION_ORDER.join(', ')}`));
      if (t === 'terminal') return ctx.print(dim('already open.'));
      if (SECTION_ORDER.includes(t)) return ctx.go(t);
      if (t === 'stack') return ctx.go('skills');
      ctx.print(err(`open: unknown section: ${args[0]}`), dim(`sections: ${SECTION_ORDER.join(', ')}`));
    },
    whoami: (_, { print }) => print(
      [['name      ', 't-dim'], [PROFILE.name, 't-strong']],
      [['role      ', 't-dim'], [PROFILE.role, 't-acc']],
      [['location  ', 't-dim'], [PROFILE.location, '']],
      [['focus     ', 't-dim'], ['requirements → architecture → production software', '']],
    ),
    ls: (_, { print }) => print(acc(SECTION_ORDER.map(s => `${s}/`).join('  ')), FILES.join('  ')),
    pwd: (_, ctx) => { const s = ctx.getSection(); ctx.print(`/home/pankaj/portfolio${s === 'home' ? '' : '/' + s}`); },
    cat: (args, { print }) => {
      const f = (args[0] || '').toLowerCase();
      if (!f) return print(err('usage: cat <file>'), dim(`files: ${FILES.join('  ')}`));
      if (f === 'about.txt') return print(...aboutText());
      if (f === 'skills.txt') return print(...skillsText());
      if (f === 'projects.txt') return print(...projectsText());
      if (f === 'experience.txt' || f === 'log') return print(...experienceText());
      print(err(`cat: ${args[0]}: No such file`));
    },
    resume: (_, ctx) => {
      if (!LINKS.resume) return ctx.print(dim('résumé not published yet.'), LINKS.email ? link(LINKS.email, `mailto:${LINKS.email}`, 'ask me for it: ') : '');
      ctx.print(link('résumé.pdf ↗', LINKS.resume, 'opening '));
      ctx.openUrl(LINKS.resume, 'resume_open');
    },
    email: (_, ctx) => {
      if (!LINKS.email) return ctx.print(dim("no public email — use 'contact'"));
      ctx.print(link(LINKS.email, `mailto:${LINKS.email}`, 'mail  '), dim("or type 'contact' to use the form"));
    },
    links: (_, { print }) => {
      const rows = [['github', LINKS.github], ['repos', LINKS.repos], ['linkedin', LINKS.linkedin], ['leetcode', LINKS.leetcode], ['resume', LINKS.resume], ['email', LINKS.email && `mailto:${LINKS.email}`]].filter(([, u]) => u);
      print(hi('LINKS'));
      rows.forEach(([k, u]) => print(link(u.replace(/^mailto:/, ''), u, k.padEnd(10))));
    },
    github: (_, { print }) => {
      const live = readCache();
      const repos = live || (GITHUB.pinned || []).map(r => ({ name: r.name, url: `https://github.com/${GITHUB.user}/${r.name}`, lang: r.lang }));
      print(hi(`GITHUB @${GITHUB.user}`), dim(live ? 'recently pushed:' : 'pinned repositories:'));
      repos.forEach(r => print([[`  ${(r.lang || '').padEnd(12)}`, 't-dim'], [r.name, 't-acc', r.url]]));
      if (LINKS.repos) print('', link('all repositories ↗', LINKS.repos));
    },
    snake: (_, ctx) => { ctx.print(acc('loading SNAKE.EXE …')); ctx.startGame(); },
    banner: (args, ctx) => {
      const text = args.join(' ').slice(0, 12);
      if (!text) return ctx.print(err('usage: banner <text>'), dim('max 12 characters'));
      if (!canRender(text)) return ctx.print(err('banner: unsupported character'), dim(`supported: ${SUPPORTED.replace(' ', '␠')}`));
      ctx.banner(text);
    },
    render: (args, ctx) => {
      const m = (args[0] || '').toLowerCase();
      if (!m) return ctx.print([['renderer: ', 't-dim'], [ctx.getRender(), 't-acc']], dim('usage: render ascii | render vector'));
      if (m === 'ascii' || m === 'vector') { ctx.setRender(m); ctx.print([['renderer → ', 't-dim'], [m, 't-acc']]); }
      else ctx.print(err(`render: unknown mode '${args[0]}'`), dim('modes: ascii, vector'));
    },
    theme: (args, ctx) => {
      const name = (args[0] || '').toLowerCase();
      if (!name) {
        ctx.print(hi('THEMES'));
        THEMES.forEach(t => ctx.print([[t === ctx.getTheme() ? '● ' : '○ ', 't-acc'], [t, t === ctx.getTheme() ? 't-strong' : 't-dim']]));
        return ctx.print('', dim('usage: theme <name>'));
      }
      if (THEMES.includes(name)) { ctx.setTheme(name); ctx.print([['theme set → ', 't-dim'], [name, 't-acc']]); }
      else ctx.print(err(`theme: unknown theme '${args[0]}'`), dim(`available: ${THEMES.join(', ')}`));
    },
    dock: (args, ctx) => {
      const side = (args[0] || '').toLowerCase();
      if (!side) return ctx.print([['dock: ', 't-dim'], [ctx.getDock(), 't-acc']], dim('usage: dock left | dock right'));
      if (side === 'left' || side === 'right') { ctx.setDock(side); ctx.print([['terminal docked → ', 't-dim'], [side, 't-acc']]); }
      else ctx.print(err(`dock: unknown side '${args[0]}'`), dim('sides: left, right'));
    },
    sound: (args, ctx) => {
      const a = (args[0] || '').toLowerCase();
      if (!a) return ctx.print([['sound: ', 't-dim'], [ctx.getSound() ? 'on' : 'off', 't-acc']], dim('usage: sound on | sound off | sound test'));
      if (a === 'on' || a === 'off') { ctx.setSound(a === 'on'); return ctx.print([['sound → ', 't-dim'], [a, 't-acc']]); }
      if (a === 'test') {
        if (!ctx.getSound()) return ctx.print(dim("sound is off — type 'sound on' first"));
        ['bootDone', 'catch', 'theme'].forEach((n, i) => setTimeout(() => ctx.playSound(n), i * 420));
        return ctx.print(acc('♪ playing: boot · catch · theme'));
      }
      ctx.print(err(`sound: unknown option '${args[0]}'`), dim('options: on, off, test'));
    },
    history: (_, ctx) => {
      const h = ctx.getHistory();
      if (!h.length) return ctx.print(dim('history is empty'));
      h.forEach((c, i) => ctx.print([[String(i + 1).padStart(4) + '  ', 't-dim'], [c, '']]));
    },
    clear: (_, ctx) => ctx.clear(),
    exit: (_, ctx) => ctx.close(),
    echo: (args, { print }) => print(args.join(' ')),

    /* easter eggs — professional and subtle */
    coffee: (_, { print }) => print(acc('      ( ('), acc('       ) )'), acc('    ........'), acc('    |      |]'), acc('    \\      /'), acc("     `----'"), dim('brewing… caffeine level restored.')),
    sudo: (args, ctx) => {
      const rest = args.join(' ').toLowerCase();
      if (rest === 'hire pankaj' || rest === `hire ${PROFILE.name.toLowerCase()}`) {
        ctx.print(dim('[sudo] password for visitor: ********'), acc('Permission granted.'), [['Excellent decision.', 't-strong']]);
        setTimeout(() => ctx.go('contact'), 400);
        return;
      }
      ctx.print(err('visitor is not in the sudoers file.'), dim("hint: try 'sudo hire pankaj'"));
    },
    matrix: (_, { print }) => {
      const glyphs = 'アイウエオカキクケコ01ΣΔλ<>/{}';
      for (let r = 0; r < 4; r++) {
        let s = '';
        for (let i = 0; i < 36; i++) s += glyphs[(Math.random() * glyphs.length) | 0];
        print([[s, r % 2 ? 't-vi' : 't-acc']]);
      }
      print(dim('signal decoded. this system runs on violet, not green.'));
    },
    neofetch: (_, ctx) => {
      const info = [
        [['pankaj', 't-acc'], ['@', 't-dim'], ['portfolio', 't-acc']],
        dim('-----------------'),
        [['OS       ', 't-vi'], ['PKS.OS (React + Tailwind)', '']],
        [['Role     ', 't-vi'], [PROFILE.role, '']],
        [['Region   ', 't-vi'], [PROFILE.location, '']],
        [['Shell    ', 't-vi'], ['pks-sh 1.4', '']],
        [['Sound    ', 't-vi'], [ctx.getSound() ? '8-bit synth · on' : '8-bit synth · off', '']],
        [['Renderer ', 't-vi'], [ctx.getRendererLabel(), '']],
        [['Theme    ', 't-vi'], [ctx.getTheme(), '']],
      ];
      const logo = ['  ▄▄▄▄▄▄▄▄▄  ', ' █ ▄▄▄ ▄▄▄ █ ', ' █ █▄█ █▄▄ █ ', ' █ █   ▄▄█ █ ', ' █▄▄▄▄▄▄▄▄▄█ ', '   PKS.OS    ', '', ''];
      for (let i = 0; i < Math.max(logo.length, info.length); i++) ctx.print([[(logo[i] || '').padEnd(15), 't-vi'], ...(info[i] || [])]);
    },
  };
  commands['?'] = commands.help;
  commands.man = commands.help;
  commands.close = commands.exit;
  return commands;
}

export function completionsFor(commands) {
  return [
    ...Object.keys(commands).filter(k => k !== '?'),
    ...FILES.map(f => `cat ${f}`), ...SECTION_ORDER.map(s => `open ${s}`), ...SECTION_ORDER.map(s => `cd ${s}`),
    ...THEMES.map(t => `theme ${t}`), 'render ascii', 'render vector', 'dock left', 'dock right', 'sound on', 'sound off', 'sound test', 'cat experience.txt', 'sudo hire pankaj',
  ];
}


