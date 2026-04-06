// ===== STATE =====
let chosenQuestion = '';
let chosenQuestionKey = '';
const questionTexts = {
  Q1: 'What helps us live well, and what pulls us away from a good life?',
  Q2: 'Can a life be good even when it involves significant suffering or loss?',
  Q3: 'Does pursuing a good life get in the way of actually achieving a good life?',
  Q4: 'Is character more important than experience in judging whether a life is good?',
  Q5: 'Is the good life about what happens to us, what we do, or how we perceive life?'
};

const philosopherData = {
  'Hedonism': {
    title: 'Hedonism',
    philosophers: [
      { name: 'Epicurus (341-270 BCE)', desc: 'Key figure. Static vs moving pleasures, natural/necessary desires, ataraxia.' },
      { name: 'Jeremy Bentham (1748-1832)', desc: 'Sensory/quantitative hedonism. All pleasures equal in kind.' },
      { name: 'Fred Feldman (contemporary)', desc: 'Attitudinal Hedonism. Pleasure as attitude, not sensation. DAIAH refinement.' },
      { name: 'Robert Nozick (1938-2002)', desc: 'Critic. Experience Machine thought experiment.' }
    ]
  },
  'Desire-Satisfaction': {
    title: 'Desire-Satisfaction Theory',
    philosophers: [
      { name: 'Derek Parfit (1942-2017)', desc: 'Success Theory (informed desire). Three theories of well-being.' },
      { name: 'John Rawls (1921-2002)', desc: 'Grass-blade counter objection to unrestricted desire theory.' },
      { name: 'Alasdair MacIntyre (b. 1929)', desc: 'Internal goods and practices. Bridges desire theory and virtue ethics.' },
      { name: 'David Hume (1711-1776)', desc: 'Calm passions, reason as slave of the passions.' }
    ]
  },
  'Spontaneity': {
    title: 'Spontaneity & Wu Wei',
    philosophers: [
      { name: 'Zhuangzi (370-287 BCE)', desc: 'Daoist. Butcher Ding, collection and shedding, effortless expertise.' },
      { name: 'Confucius (551-479 BCE)', desc: 'Mastery of ritual as path to spontaneity. Analects 2.4.' },
      { name: 'Edward Slingerland (contemporary)', desc: 'Scholar of wu wei. Connections to flow, de as charismatic power.' },
      { name: 'Mihaly Csikszentmihalyi (1934-2021)', desc: 'Flow theory. Nine conditions of flow. Challenge-skill balance.' },
      { name: 'Keith Sawyer (contemporary)', desc: 'Improvisation theory. Problem-finding vs problem-solving.' }
    ]
  },
  'Virtue Ethics': {
    title: 'Virtue Ethics',
    philosophers: [
      { name: 'Aristotle (384-322 BCE)', desc: 'Function argument, Doctrine of the Mean, eudaimonia, practical wisdom.' },
      { name: 'Martha Nussbaum (b. 1947)', desc: 'Non-relative virtues. Capabilities approach. Grounding experiences.' },
      { name: 'Alasdair MacIntyre (b. 1929)', desc: 'Practices with internal goods. Virtue and social roles.' }
    ]
  },
  'Stoicism': {
    title: 'Stoicism',
    philosophers: [
      { name: 'Epictetus (c. 55-135 CE)', desc: 'Enchiridion, Discourses. Dichotomy of control. Three disciplines.' },
      { name: 'Marcus Aurelius (121-180 CE)', desc: 'Meditations. Philosopher-emperor. Daily Stoic practice.' },
      { name: 'Seneca (c. 4 BCE-65 CE)', desc: 'Letters to Lucilius. Voluntary discomfort. Practical Stoic advice.' },
      { name: 'Jim Stockdale (1923-2005)', desc: 'Applied Stoicism under extreme conditions as POW.' },
      { name: 'Zeno of Citium (c. 334-262 BCE)', desc: 'Founder of Stoicism. Taught at the Stoa Poikile.' }
    ]
  }
};

// ===== NAVIGATION =====
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const map = {
    'hub': 'page-hub',
    'task': 'page-task',
    'task-overview': 'page-task-overview',
    'task-criteria': 'page-task-criteria',
    'task-example': 'page-task-example',
    'trials': 'page-trials',
    'theories': 'page-theories',
    'drafting': 'page-drafting',
    'theory-hedonism': 'page-theory-hedonism',
    'theory-desire': 'page-theory-desire',
    'theory-spontaneity': 'page-theory-spontaneity',
    'theory-virtue': 'page-theory-virtue',
    'theory-stoicism': 'page-theory-stoicism',
    'quiz': 'page-quiz'
  };
  const el = document.getElementById(map[pageId] || pageId);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
  updateBanners();
}

function updateBanners() {
  const bannerIds = ['bannerTheoryResp','bannerHub','bannerTask','bannerTaskOverview','bannerTaskCriteria','bannerTaskExample','bannerTrials','bannerTheories','bannerHed','bannerDesire','bannerSpont','bannerVirt','bannerStoic','bannerDraft','bannerQuiz'];
  const textIds = ['bannerTextResp','bannerTextHub','bannerTextTask','bannerTextTaskOverview','bannerTextTaskCriteria','bannerTextTaskExample','bannerTextTrials','bannerTextTheories','bannerTextHed','bannerTextDesire','bannerTextSpont','bannerTextVirt','bannerTextStoic','bannerTextDraft','bannerTextQuiz'];
  textIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = chosenQuestion;
  });
}

// ===== PAGE 1: WELCOME =====
function submitGoodLife() {
  const val = document.getElementById('goodLifeDef').value.trim();
  if (!val) { alert('Please share your thoughts before continuing.'); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-question').classList.add('active');
  window.scrollTo(0, 0);
}

// ===== PAGE 2: QUESTION SELECTION =====
function submitQuestion() {
  const sel = document.getElementById('questionSelect');
  if (!sel.value) { alert('Please select a question.'); return; }
  chosenQuestionKey = sel.value;
  chosenQuestion = questionTexts[sel.value];
  updateBanners();
  document.getElementById('navPills').classList.add('visible');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-hub').classList.add('active');
  window.scrollTo(0, 0);
}

// ===== STEPPER SYSTEM =====
function getStepperState(containerId) {
  const container = document.getElementById(containerId);
  const steps = container.querySelectorAll('.step');
  let current = 0;
  steps.forEach((s, i) => { if (s.classList.contains('active')) current = i; });
  return { container, steps, current, total: steps.length };
}

function initStepper(containerId, dotsId) {
  const { steps, current } = getStepperState(containerId);
  const dotsEl = document.getElementById(dotsId);
  if (dotsEl) {
    dotsEl.innerHTML = '';
    for (let i = 0; i < steps.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (i === current ? ' active' : '') + (i < current ? ' completed' : '');
      dotsEl.appendChild(dot);
    }
  }
}

function stepNav(containerId, dir) {
  const { container, steps, current, total } = getStepperState(containerId);
  const next = current + dir;

  if (next < 0) return;

  // Handle end of stepper
  if (next >= total) {
    if (containerId === 'theoryPrompts') {
      // Go to hub after theory responses
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-hub').classList.add('active');
      window.scrollTo(0, 0);
      return;
    }
    if (containerId === 'taskOverviewSteps') {
      goTo('task');
      return;
    }
    return;
  }

  steps[current].classList.remove('active');
  steps[next].classList.add('active');

  // Update dots
  const page = container.closest('.page');
  const dotsEl = page.querySelector('.step-dots');
  if (dotsEl) {
    const dots = dotsEl.querySelectorAll('.step-dot');
    dots.forEach((d, i) => {
      d.className = 'step-dot' + (i === next ? ' active' : '') + (i < next ? ' completed' : '');
    });
  }

  // Update prev/next buttons visibility
  const prevBtn = page.querySelector('.stepper-nav .btn-outline');
  const nextBtn = page.querySelector('.stepper-nav .btn-gold');
  if (prevBtn) prevBtn.style.visibility = next === 0 ? 'hidden' : 'visible';
  if (nextBtn) {
    if (next === total - 1) {
      if (containerId === 'theoryPrompts') nextBtn.textContent = 'Continue to Adventure! \u2192';
      else nextBtn.textContent = 'Done!';
    } else {
      nextBtn.textContent = 'Next \u2192';
    }
  }

  window.scrollTo(0, 0);
}

// Theory response navigation (special wrapper)
let trStep = 0;
function theoryRespNav(dir) {
  stepNav('theoryPrompts', dir);
}

// ===== QUIZ FEEDBACK DATA =====
const quizExplanations = {
  'task-q1': 'Critical Analysis (CA) is specifically about evaluating the strengths and weaknesses of philosophical positions. KU is about knowing the positions; RA is about building arguments; C is about terminology and referencing.',
  'task-q2': 'The maximum is 1500 words for a written submission. You can also submit a multimodal piece (up to 10 minutes) or a hybrid.',
  'task-q3': 'You must explain at least two philosophical positions. You may use more, but two is the minimum required.',
  'task-q4': 'The oral defence is in addition to your written/multimodal submission, not a replacement. It\'s a 2-3 minute defence of your position.',
  'hed-q1': 'Hedonism\'s core claim is that a good life maximises pleasure and minimises pain. Everything else (virtue, achievement, knowledge) matters only insofar as it produces pleasure.',
  'hed-q2': 'Epicurus distinguished moving pleasures (active sensory stimulation) from static pleasures (the calm state of tranquillity or ataraxia). He argued static pleasures are preferable because they are more sustainable.',
  'hed-q3': 'Nozick asks: would you plug into a machine that gives you any pleasurable experiences you want, but none of it is real? Most people say no \u2014 suggesting we value actually doing things, being a certain kind of person, and contact with reality, not just how life feels.',
  'hed-q4': 'Desire-satisfaction theory says your life goes well when you get what you want. Unlike hedonism, it\'s not just about how things feel \u2014 it\'s about whether your actual desires are fulfilled in the real world.',
  'spont-q1': 'Wu wei (\u7121\u70BA) literally means "no doing" or "non-action," but is better understood as perfectly effortless action \u2014 acting so naturally that it feels as if you\'re not trying at all.',
  'spont-q2': 'The Confucian path masters ritual first (like learning scales before improvising), hoping discipline becomes second nature. The Daoist path starts with spontaneity itself, avoiding rigid rules from the outset.',
  'spont-q3': 'Collection means calm, broad awareness of the domain of activity. Shedding means eliminating obstacles: distractions, thoughts of reward, selfishness, even concern with your own skill level.',
  'spont-q4': 'De is the charismatic power or virtue that naturally emanates from someone in wu wei. Because they act without ulterior motives, others perceive them as honest and trustworthy and naturally want to follow them.',
  'spont-q5': 'Mihaly Csikszentmihalyi coined "flow" in 1990 to describe the state of complete absorption in an activity where challenge and skill are perfectly balanced.',
  'spont-q6': 'The challenge-skill balance is the key condition: if the challenge is too high for your skill, you feel anxiety; too low and you feel boredom. Flow happens in the sweet spot between the two.',
  'virt-q1': 'Aristotle argued that just as a good knife is one that cuts well (fulfils its function), a good human is one who reasons well, since reasoning is our distinctive capacity. Flourishing means excelling at this.',
  'virt-q2': 'The Mean is not about being mediocre \u2014 it\'s about finding the right response for the situation. Courage, for example, is the right amount of response to danger: not too much (rashness) and not too little (cowardice).',
  'virt-q3': 'For Aristotle, true virtue isn\'t about gritting your teeth and doing the right thing despite wanting to do otherwise. The genuinely virtuous person finds the right action pleasant \u2014 their desires are educated.',
  'virt-q4': 'Nussbaum argues that certain human experiences (facing death, managing appetites, distributing resources) are universal across all cultures. The virtues are the excellent responses to these shared experiences.',
  'virt-q5': 'A "thin" definition fixes what the virtue is about (e.g., "courage = whatever it is to respond well to danger") without specifying the details. Different cultures then compete to give the best "thick" account of what responding well actually looks like.',
  'virt-q6': 'Grounding experiences are the universal spheres of human life \u2014 things like mortality, bodily appetite, property, social relations \u2014 that every person in every culture must navigate. These anchor the virtues across cultures.',
  'virt-q7': 'Courage is the mean between cowardice (too little response to danger, driven by excessive fear) and rashness (too much, driven by insufficient caution). The courageous person faces the right dangers, for the right reasons, in the right way.',
  'stoic-q1': 'The dichotomy of control is the foundational Stoic practice: clearly distinguishing what is "up to us" (our judgements, desires, attitudes) from what is not (health, wealth, reputation, other people\'s actions). Focus only on the former.',
  'stoic-q2': 'Stoics view emotions not as involuntary reactions but as judgements we make about events. If you feel angry, it\'s because you\'ve judged that something bad has happened. Change the judgement, change the emotion. This is why Stoics believe we are responsible for our emotional states.',
  'stoic-q3': 'The four Stoic cardinal virtues are Wisdom (phronesis), Courage (andreia), Temperance (sophrosyne), and Justice (dikaiosyne). All four are interdependent \u2014 you can\'t have one without the others.',
  'stoic-q4': 'Aristotle believed some external goods (health, wealth, social support) are needed for virtues to manifest \u2014 you can\'t be generous without resources. Stoics completely reject this: the will alone determines flourishing, regardless of circumstances.',
  'stoic-q5': 'Premeditatio malorum (premeditation of evils) involves deliberately imagining the loss of things you value \u2014 your health, loved ones, possessions. This isn\'t pessimism; it trains you to appreciate what you have and reduces the shock if loss occurs.'
};

// ===== QUIZ SYSTEM =====
function checkQuiz(el, result, feedbackId) {
  const options = el.parentElement.querySelectorAll('.quiz-opt');
  options.forEach(o => {
    o.classList.add('disabled');
    if (o === el) {
      o.classList.add(result);
    }
  });

  // Highlight correct answer if wrong
  if (result === 'incorrect') {
    options.forEach(o => {
      const onclick = o.getAttribute('onclick');
      if (onclick && onclick.includes("'correct'")) {
        o.classList.add('correct');
      }
    });
  }

  const fb = document.getElementById(feedbackId);
  if (fb) {
    fb.classList.add('show', result);
    const prefix = result === 'correct' ? '\u2705 Correct! ' : '\u274C Not quite. ';
    const explanation = quizExplanations[feedbackId] || '';
    fb.textContent = prefix + explanation;
  }
}

// ===== HELP TOGGLE =====
function toggleHelp(id) {
  const el = document.getElementById(id);
  el.classList.toggle('show');
}

// ===== THEORY SELECTION (Drafting page) =====
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('theory-check')) {
    const checked = document.querySelectorAll('.theory-check:checked');
    if (checked.length > 2) {
      e.target.checked = false;
      alert('Please select exactly two theories.');
      return;
    }

    const container = document.getElementById('theoryPhilosophers');
    const list = document.getElementById('philosopherList');

    if (checked.length > 0) {
      container.style.display = 'block';
      list.innerHTML = '';
      checked.forEach(cb => {
        const data = philosopherData[cb.value];
        if (data) {
          let html = '<div class="card" style="margin-bottom:16px"><h4 style="color:#f0d78c;margin-bottom:10px">' + data.title + '</h4>';
          data.philosophers.forEach(p => {
            html += '<p style="margin-bottom:6px"><strong class="gold">' + p.name + '</strong>: ' + p.desc + '</p>';
          });
          html += '</div>';
          list.innerHTML += html;
        }
      });
    } else {
      container.style.display = 'none';
    }
  }
});

// ===== INIT ALL STEPPERS =====
document.addEventListener('DOMContentLoaded', function() {
  ['taskOverviewSteps','trialSteps','hedSteps','desireSteps','spontSteps','virtSteps','stoicSteps','draftSteps'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const page = el.closest('.page');
      const dotsEl = page ? page.querySelector('.step-dots') : null;
      if (dotsEl) initStepper(id, dotsEl.id);
    }
  });
  // Init dots
  initStepper('taskOverviewSteps', 'taskOverviewDots');
  initStepper('trialSteps', 'trialDots');
  initStepper('hedSteps', 'hedDots');
  initStepper('desireSteps', 'desireDots');
  initStepper('spontSteps', 'spontDots');
  initStepper('virtSteps', 'virtDots');
  initStepper('stoicSteps', 'stoicDots');
  initStepper('draftSteps', 'draftDots');
});

// ===== AUTO-SAVE to localStorage =====
function saveState() {
  const data = {};
  document.querySelectorAll('textarea').forEach((ta, i) => {
    data['ta_' + i] = ta.value;
  });
  document.querySelectorAll('select').forEach((s, i) => {
    data['sel_' + i] = s.value;
  });
  document.querySelectorAll('.theory-check').forEach((cb, i) => {
    data['cb_' + i] = cb.checked;
  });
  data.chosenQuestion = chosenQuestion;
  data.chosenQuestionKey = chosenQuestionKey;
  localStorage.setItem('philHappiness', JSON.stringify(data));
}

function loadState() {
  try {
    const raw = localStorage.getItem('philHappiness');
    if (!raw) return;
    const data = JSON.parse(raw);
    document.querySelectorAll('textarea').forEach((ta, i) => {
      if (data['ta_' + i]) ta.value = data['ta_' + i];
    });
    document.querySelectorAll('select').forEach((s, i) => {
      if (data['sel_' + i]) s.value = data['sel_' + i];
    });
    document.querySelectorAll('.theory-check').forEach((cb, i) => {
      if (data['cb_' + i]) cb.checked = data['cb_' + i];
    });
    if (data.chosenQuestionKey) chosenQuestionKey = data.chosenQuestionKey;
    if (data.chosenQuestion) {
      chosenQuestion = data.chosenQuestion;
      updateBanners();
    }
  } catch(e) {}
}

// Auto-save every 10 seconds
setInterval(saveState, 10000);
// Also save on page unload
window.addEventListener('beforeunload', saveState);
// Load on start
document.addEventListener('DOMContentLoaded', loadState);

// ===== PRINT ALL PAGES =====
function printAll() {
  // Show all pages so they all appear in print
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.add('print-show'));
  // Show all steps within steppers
  const steps = document.querySelectorAll('.step');
  steps.forEach(s => s.classList.add('active'));
  // Trigger print
  window.print();
  // Restore original state after printing
  setTimeout(() => {
    pages.forEach(p => p.classList.remove('print-show'));
    // Restore step visibility — re-init steppers
    steps.forEach(s => s.classList.remove('active'));
    // Re-activate current steps
    ['taskOverviewSteps','trialSteps','hedSteps','desireSteps','spontSteps','virtSteps','stoicSteps','draftSteps'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const firstStep = el.querySelector('.step');
        if (firstStep) firstStep.classList.add('active');
      }
    });
  }, 500);
}
