function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  const button = document.getElementById('menuButton');

  const isOpen = menu.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
  button.classList.toggle('open', isOpen);
  button.setAttribute('aria-expanded', isOpen);
  button.setAttribute('aria-label', isOpen ? 'Close calculator menu' : 'Open calculator menu');
}

function closeMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  const button = document.getElementById('menuButton');

  menu.classList.remove('open');
  overlay.classList.remove('open');
  button.classList.remove('open');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open calculator menu');
}

function switchPage(pageId, auto = false) {
  const current = document.querySelector(".page.active").id;
  if (current === pageId) {
    closeMenu();
    return;
  } else if (!auto) {
    document.querySelectorAll(".page-action").forEach(btn => btn.hidden = true);
    document.querySelector("#data").dataset.calltree = "[]";
  }

  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.ref === pageId);
  });

  document.getElementById(pageId).classList.add('active');
  closeMenu();
}

function calculate(caller, target, str) {
  let dataElement = document.querySelector("#data");
  let tempArr = JSON.parse(dataElement.dataset.calltree);
  tempArr.push(JSON.stringify({ caller, target, text: str }));
  dataElement.dataset.calltree = JSON.stringify(tempArr);

  document.querySelectorAll(".page-action").forEach(btn => {
    btn.hidden = false;
    btn.innerText = `Return to ${str}`;
  });

  switchPage(target, true);
}

function returnCalc() {
  let dataElement = document.querySelector("#data");
  let tempArr = JSON.parse(dataElement.dataset.calltree);
  if (tempArr.length === 0) return;

  let lastEntry = JSON.parse(tempArr.pop());
  dataElement.dataset.calltree = JSON.stringify(tempArr);

  switchPage(lastEntry.caller, true);

  let pageActions = document.querySelectorAll(".page-action");
  let remainingEntry = tempArr.at(-1);

  if (!remainingEntry) {
    pageActions.forEach(btn => btn.hidden = true);
  } else {
    let parsed = JSON.parse(remainingEntry);
    pageActions.forEach(btn => {
      btn.hidden = false;
      btn.innerText = `Return to ${parsed.text}`;
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Closes modal if user clicks outside the modal content box
function closeModalOnBackdrop(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

/* Automatic data-holds field synchronization */
document.addEventListener('input', function(e) {
  const key = e.target.dataset.holds;
  if (!key) return;

  const value = e.target.value;
  const sourcePage = e.target.closest('.page')?.id;

  const detail = e.detail?.calculatorEvent ? e.detail : null;
  const visitedPages = Array.isArray(detail?.visitedPages)
    ? detail.visitedPages
    : (sourcePage ? [sourcePage] : []);

  const matchingInputs =
    document.querySelectorAll(`input[data-holds="${key}"]`);

  matchingInputs.forEach(input => {
    if (input === e.target) return;
    if (input.value === value) return;

    input.value = value;

    const targetPage = input.closest('.page')?.id;
    const alreadyVisited =
      targetPage && visitedPages.includes(targetPage);

    const nextVisitedPages =
      targetPage && !alreadyVisited
        ? [...visitedPages, targetPage]
        : visitedPages;

    input.dispatchEvent(new CustomEvent('input', {
      bubbles: false,
      detail: {
        calculatorEvent: true,
        recalculate: !alreadyVisited,
        visitedPages: nextVisitedPages
      }
    }));
  });
});

function formatTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '';

  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

function setCalculatedValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  const placeholder = el.placeholder.trim();
  const calculated = String(value).trim();

  let matchesPlaceholder = false;
  if (calculated.includes(':')) {
    matchesPlaceholder = (placeholder === calculated);
  } else {
    const placeholderNumber = parseFloat(placeholder);
    const calculatedNumber = parseFloat(calculated);
    matchesPlaceholder =
      placeholder !== '' &&
      Number.isFinite(placeholderNumber) &&
      Number.isFinite(calculatedNumber) &&
      placeholderNumber === calculatedNumber;
  }

  const newValue = matchesPlaceholder ? '' : value;

  // Only trigger the flash animation if the value actually changed
  if (el.value !== newValue && newValue !== '') {
    el.classList.remove('flash-updated');
    // Force a browser reflow so the animation restarts smoothly
    void el.offsetWidth;
    el.classList.add('flash-updated');
  }

  el.value = newValue;

  if (el.dataset.holds) {
    const page = el.closest('.page')?.id;
    el.dispatchEvent(new CustomEvent('input', {
      bubbles: true,
      detail: {
        calculatorEvent: true,
        recalculate: false,
        visitedPages: page ? [page] : []
      }
    }));
  }
}

// Force dot as decimal separator ("12,34" -> "12.34")
function formatDecimal(val) {
  if (val === null || val === undefined || val === '') return '';
  return String(val).replace(',', '.');
}

function getInputValue(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const value = el.value.trim();
  const fallback = el.placeholder;
  const number = parseFloat(value !== '' ? value : fallback);
  return Number.isNaN(number) ? NaN : number;
}

function syncValue(element) {
  const key = element.dataset.holds;
  if (!key) return;
  document.querySelectorAll(`input[data-holds="${key}"]`).forEach(input => {
    if (input !== element && input.value !== element.value) {
      input.value = element.value;
      input.dispatchEvent(new Event('input', { bubbles: false }));
    }
  });
}

function recalcSpeed(source, event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const dia = getInputValue('sp_dia');
  const mMin = getInputValue('sp_mmin');
  const rpm = getInputValue('sp_rpm');

  if (source === 'dia' || source === 'mmin') {
    if (Number.isFinite(dia) && Number.isFinite(mMin) && dia !== 0) {
      setCalculatedValue(
        'sp_rpm',
        (1000 * mMin / (Math.PI * dia)).toFixed(0)
      );
    }
  } else if (source === 'rpm') {
    if (Number.isFinite(dia) && Number.isFinite(rpm)) {
      setCalculatedValue(
        'sp_mmin',
        (Math.PI * dia * rpm / 1000).toFixed(0)
      );
    }
  }
}

function recalcFeed(source, event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const rpm = getInputValue('fe_rpm');
  const mmMin = getInputValue('fe_mmmin');
  let mmRev = getInputValue('fe_mmrev');
  const teeth = getInputValue('fe_teeth');
  const mmTooth = getInputValue('fe_mmtooth');

  if (source === 'rpm') {
    if (Number.isFinite(rpm) && Number.isFinite(mmRev)) {
      setCalculatedValue('fe_mmmin', (rpm * mmRev).toFixed(0));
    }
  } else if (source === 'mmmin') {
    if (Number.isFinite(mmMin) && Number.isFinite(rpm) && rpm !== 0) {
      const calcMmRev = mmMin / rpm;
      setCalculatedValue('fe_mmrev', calcMmRev.toFixed(3));
      if (Number.isFinite(teeth) && teeth !== 0) {
        setCalculatedValue('fe_mmtooth', (calcMmRev / teeth).toFixed(3));
      }
    }
  } else if (source === 'mmrev') {
    if (Number.isFinite(mmRev) && Number.isFinite(rpm)) {
      setCalculatedValue('fe_mmmin', (rpm * mmRev).toFixed(0));
    }
    if (Number.isFinite(mmRev) && Number.isFinite(teeth) && teeth !== 0) {
      setCalculatedValue('fe_mmtooth', (mmRev / teeth).toFixed(3));
    }
  } else if (source === 'fe_mmtooth') {
    if (Number.isFinite(mmTooth) && Number.isFinite(teeth)) {
      const calcMmRev = mmTooth * teeth;
      setCalculatedValue('fe_mmrev', calcMmRev.toFixed(3));
      if (Number.isFinite(rpm)) {
        setCalculatedValue('fe_mmmin', (rpm * calcMmRev).toFixed(0));
      }
    }
  } else if (source === 'fe_teeth') {
    if (Number.isFinite(mmTooth) && Number.isFinite(teeth)) {
      const calcMmRev = mmTooth * teeth;
      setCalculatedValue('fe_mmrev', calcMmRev.toFixed(3));
      if (Number.isFinite(rpm)) {
        setCalculatedValue('fe_mmmin', (rpm * calcMmRev).toFixed(0));
      }
    } else if (Number.isFinite(mmRev) && Number.isFinite(teeth) && teeth !== 0) {
      setCalculatedValue('fe_mmtooth', (mmRev / teeth).toFixed(3));
    }
  }

  // Keep downstream dependents (e.g. cutting time basic) updated
  recalcCuttingTimeBasic();
}

function recalcCuttingTimeBasic(event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const feed = getInputValue('ct_basic_feed');
  const length = getInputValue('ct_basic_length');
  const passes = getInputValue('ct_basic_passes');
  const result = document.getElementById('ct_basic_result');

  if (Number.isFinite(feed) && Number.isFinite(length) &&
      Number.isFinite(passes) && feed > 0) {
    const timeInMinutes = (length * passes) / feed;
    setCalculatedValue('ct_basic_result', formatTime(timeInMinutes));
  } else {
    result.value = '';
  }
}

function recalcTrigonometry(input) {
  if (input.value != '') {
    input.classList.add("userValue");
  } else {
    input.classList.remove("userValue");
  }

  let outputs = [];

  const allInputs = document.querySelectorAll(".trigInput");
  const allSides = document.querySelectorAll(".trigSide");
  const allAngles = document.querySelectorAll(".trigAngle");

  let userValues = document.querySelectorAll(".userValue");
  if (userValues.length == 1 && input.classList.contains("trigAngle")) {
    for (let i = 0; i < allAngles.length; i++) {
      if (allAngles[i].id != input.id) {
        allAngles[i].readOnly = true;
      }
    }
  } else if (userValues.length == 2) {
    for (let i = 0; i < allInputs.length; i++) {
      if (allInputs[i].classList.contains("userValue") == false) {
        outputs.push(allInputs[i]);
        allInputs[i].readOnly = true;
      }
    }
  } else {
    for (let i = 0; i < allInputs.length; i++) {
      if (allInputs[i].readOnly) { allInputs[i].value = ''; }
      allInputs[i].readOnly = false;
    }
  }

  if (outputs.length == 0) {
    return;
  }

  const legA = document.querySelector("#trig_a");
  const legB = document.querySelector("#trig_b");
  const hypo = document.querySelector("#trig_c");
  const angA = document.querySelector("#trig_angle_a");
  const angB = document.querySelector("#trig_angle_b");

  if (document.querySelector(".trigAngle.userValue") != null) {
    let secondAngle = 90 - document.querySelector(".trigAngle.userValue").value;
    document.querySelector(".trigAngle[readonly]").value = secondAngle;

    if (legA.classList.contains("userValue")) {
      legB.value = (legA.value * Math.tan(toRadians(angB.value))).toFixed(3);
      hypo.value = (legA.value / Math.cos(toRadians(angB.value))).toFixed(3);
    } else if (legB.classList.contains("userValue")) {
      legA.value = (legB.value * Math.tan(toRadians(angA.value))).toFixed(3);
      hypo.value = (legB.value / Math.cos(toRadians(angA.value))).toFixed(3);
    } else {
      legA.value = (hypo.value * Math.sin(toRadians(angA.value))).toFixed(3);
      legB.value = (hypo.value * Math.sin(toRadians(angB.value))).toFixed(3);
    }
  } else {
    if (hypo.readOnly) {
      angA.value = toDegrees(Math.atan(legA.value / legB.value)).toFixed(2);
      angB.value = toDegrees(Math.atan(legB.value / legA.value)).toFixed(2);
      hypo.value = Math.sqrt(Math.pow(legA.value, 2) + Math.pow(legB.value, 2)).toFixed(3);
    } else if (legA.readOnly) {
      angA.value = toDegrees(Math.acos(legB.value / hypo.value)).toFixed(2);
      angB.value = toDegrees(Math.asin(legB.value / hypo.value)).toFixed(2);
      legA.value = Math.sqrt(Math.pow(hypo.value, 2) - Math.pow(legB.value, 2)).toFixed(3);
    } else {
      angA.value = toDegrees(Math.acos(legA.value / hypo.value)).toFixed(2);
      angB.value = toDegrees(Math.asin(legA.value / hypo.value)).toFixed(2);
      legB.value = Math.sqrt(Math.pow(hypo.value, 2) - Math.pow(legA.value, 2)).toFixed(3);
    }
  }
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function recalcMillingMRR(event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const width = getInputValue('mmr_width');
  const depth = getInputValue('mmr_depth');
  const feed = getInputValue('mmr_feed');
  const result = document.getElementById('mill_mrr_result');

  if (Number.isFinite(width) && Number.isFinite(depth) &&
      Number.isFinite(feed)) {
    setCalculatedValue('mill_mrr_result', (width * depth * feed / 1000).toFixed(1));
  } else {
    result.value = '';
  }
}

function recalcTurningMRR(event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const ap = getInputValue('tmr_ap');
  const speed = getInputValue('tmr_mmin');
  const feed = getInputValue('tmr_feed');
  const result = document.getElementById('turn_mrr_result');

  if (Number.isFinite(ap) && Number.isFinite(speed) &&
      Number.isFinite(feed)) {
    setCalculatedValue('turn_mrr_result', (ap * feed * speed).toFixed(1));
  } else {
    result.value = '';
  }
}

function recalcSurfaceFinish(event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const feed = getInputValue('sf_feed');
  const radius = getInputValue('sf_radius');
  const ra = document.getElementById('sf_ra');
  const rmax = document.getElementById('sf_rmax');

  if (Number.isFinite(feed) && Number.isFinite(radius) && radius > 0) {
    setCalculatedValue('sf_ra', (feed * feed / (32 * radius) * 1000).toFixed(2));
    setCalculatedValue('sf_rmax', (feed * feed / (8 * radius) * 1000).toFixed(2));
  } else {
    ra.value = '';
    rmax.value = '';
  }
}

function recalcDrillDepth(event) {
  if (event?.detail?.calculatorEvent &&
      event.detail.recalculate === false) return;

  const diameter = getInputValue('dd_diameter');
  const angle = getInputValue('dd_angle');
  const nominal = getInputValue('dd_nominal');

  const distance = document.getElementById('dd_distance');
  const totalTip = document.getElementById('dd_total_tip');
  const totalDia = document.getElementById('dd_total_dia');

  if (Number.isFinite(diameter) && Number.isFinite(angle) &&
      Number.isFinite(nominal) && diameter >= 0 && angle > 0 && angle < 180) {
    const tipDistance =
      (diameter / 2) / Math.tan((angle / 2) * Math.PI / 180);

    setCalculatedValue('dd_distance', tipDistance.toFixed(2));
    setCalculatedValue('dd_total_tip', (nominal + tipDistance).toFixed(2));
    setCalculatedValue('dd_total_dia', (nominal - tipDistance).toFixed(2));
  } else {
    distance.value = '';
    totalTip.value = '';
    totalDia.value = '';
  }
}

// Event registration for Cutting Time section to catch cross-tab syncs
document.querySelectorAll('#p-cutting-time input').forEach(input => {
  input.addEventListener('input', recalcCuttingTimeBasic);
});

// Initialize calculated fields
recalcCuttingTimeBasic();
recalcMillingMRR();
recalcTurningMRR();
recalcSurfaceFinish();
recalcDrillDepth();

// Select the current numeric value when the user focuses/clicks an input.
document.addEventListener('focusin', function(event) {
  const input = event.target;
  if (input.matches('input') && input.value !== '') {
    requestAnimationFrame(() => input.select());
  }
});

document.addEventListener('click', function(event) {
  const input = event.target;
  if (input.matches('input') && input.value !== '') {
    requestAnimationFrame(() => input.select());
  }
});

// Close menu with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeMenu();
  }
});
