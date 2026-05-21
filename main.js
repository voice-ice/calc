let earlyPayments = [];
let currentMortgageType = 'annuity';
let currentEditMonth = null;
let currentRemainingDebtForModal = 0;
const MIN_DOWN_PAYMENT_PERCENT = 20.1;
const MIN_DOWN_PAYMENT_TRENCH_PERCENT = 40;
const DVOU_PERCENT = 3;
const DISCOUNT_THRESHOLD = 50.1;
const TRENCH_PRICE_MARKUP_PERCENT = 2;
const STANDARD_ANNUITY_RATE = 20.7;
const REDUCED_ANNUITY_RATE = 19.7;

let savedValues = {
    annuity: { propertyPrice: '0', downPayment: '0', interestRate: 20.7, termValue: 30, termUnit: 'years' },
    trench: { propertyPrice: '0', downPayment: '0', interestRate: 20.7, termValue: 30, termUnit: 'years', usePriceMarkup: false },
    subsidized: { propertyPrice: '0', downPayment: '0', subsidyMonths: 12, postSubsidyRate: 20.7, termValue: 30, termUnit: 'years' }
};

let trenches = [
    { month: 0, share: 0.253 },   
    { month: 4, share: 0.249 },   
    { month: 8, share: 0.249 },   
    { month: 12, share: 0.249 }   
];

function getBaseSubsidizedRate(months) { return months === 12 ? 15.2 : 17.2; }
function getEffectiveSubsidizedRate(months, downPaymentPercent) {
    let baseRate = getBaseSubsidizedRate(months);
    if (downPaymentPercent > DISCOUNT_THRESHOLD) return Math.max(0, baseRate - 1.0);
    return baseRate;
}

function formatMoney(amount) { return Math.round(amount).toLocaleString('ru-RU') + ' ₽'; }

function getRawDiscountedPrice() {
    let basePrice = parseFloat(document.getElementById('basePrice').value) || 0;
    let discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    let discountRub = parseFloat(document.getElementById('discountRub').value) || 0;
    return Math.max(0, basePrice - (basePrice * discountPercent / 100) - discountRub);
}

function updateAnnuityRateBasedOnDownPayment() {
    if (currentMortgageType !== 'annuity') return;
    
    let propertyPrice = getCurrentPropertyPrice();
    let downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    let rateInput = document.getElementById('interestRate');
    let rateInfo = document.getElementById('rateInfo');
    
    if (propertyPrice > 0) {
        let downPercent = (downPayment / propertyPrice) * 100;
        
        if (downPercent > DISCOUNT_THRESHOLD) {
            if (Math.abs(parseFloat(rateInput.value) - REDUCED_ANNUITY_RATE) > 0.01) {
                rateInput.value = REDUCED_ANNUITY_RATE;
                rateInfo.classList.add('show');
            }
        } else {
            if (Math.abs(parseFloat(rateInput.value) - STANDARD_ANNUITY_RATE) > 0.01) {
                rateInput.value = STANDARD_ANNUITY_RATE;
                rateInfo.classList.remove('show');
            }
        }
    } else {
        rateInfo.classList.remove('show');
    }
}

function updatePrices() {
    let rawDiscounted = getRawDiscountedPrice();
    let useMarkup = (currentMortgageType === 'trench') && (document.getElementById('trenchPriceMarkup')?.checked === true);
    let priceBeforeDvou = rawDiscounted;
    let noteText = "";
    
    if (useMarkup && currentMortgageType === 'trench') {
        priceBeforeDvou = rawDiscounted * (1 + TRENCH_PRICE_MARKUP_PERCENT / 100);
        noteText = `🔨 Для траншевой ипотеки применена наценка +${TRENCH_PRICE_MARKUP_PERCENT}% за строительную готовность: ${formatMoney(rawDiscounted)} → ${formatMoney(priceBeforeDvou)}`;
    }
    
    let dvou = priceBeforeDvou * DVOU_PERCENT / 100;
    let propertyPrice = priceBeforeDvou - dvou;
    
    document.getElementById('discountedPrice').value = Math.round(rawDiscounted);
    document.getElementById('dvou').value = Math.round(dvou);
    document.getElementById('propertyPrice').value = Math.round(Math.max(0, propertyPrice));
    
    let noteDiv = document.getElementById('priceNote');
    if (useMarkup && currentMortgageType === 'trench') {
        noteDiv.innerHTML = noteText;
        noteDiv.style.display = 'block';
    } else {
        noteDiv.innerHTML = '';
        noteDiv.style.display = 'none';
    }
    
    autoAdjustDownPayment();
    
    if (currentMortgageType === 'trench') renderTrenchControls();
    calculateMortgage();
    saveCurrentValues();
}

function autoAdjustDownPayment() {
    let propertyPrice = getCurrentPropertyPrice();
    let downInput = document.getElementById('downPayment');
    let currentDown = parseFloat(downInput.value) || 0;
    let minPercent = getCurrentMinDownPercent();
    let minDown = propertyPrice * minPercent / 100;
    
    if (propertyPrice <= 0) {
        downInput.value = 0;
        let hintSpan = document.getElementById('downPaymentHint');
        if (hintSpan) hintSpan.innerHTML = '';
        return;
    }
    
    if (currentDown > propertyPrice) {
        downInput.value = Math.round(propertyPrice);
    }
    else if (currentDown < minDown) {
        downInput.value = Math.round(minDown);
    }
    else if (currentDown === 0 && propertyPrice > 0) {
        downInput.value = Math.round(minDown);
    }
    
    let hintSpan = document.getElementById('downPaymentHint');
    if (hintSpan) {
        if (currentMortgageType === 'trench') {
            hintSpan.innerHTML = `(мин. 40% = ${formatMoney(minDown)})`;
        } else {
            hintSpan.innerHTML = `(мин. 20.1% = ${formatMoney(minDown)})`;
        }
    }
    
    let newVal = parseFloat(downInput.value) || 0;
    if (propertyPrice > 0 && newVal < minDown - 0.01) {
        downInput.classList.add('error-border');
    } else {
        downInput.classList.remove('error-border');
    }
    
    updateAnnuityRateBasedOnDownPayment();
}

function getCurrentPropertyPrice() { return Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0); }
function getCurrentMinDownPercent() { return currentMortgageType === 'trench' ? MIN_DOWN_PAYMENT_TRENCH_PERCENT : MIN_DOWN_PAYMENT_PERCENT; }
function getTotalMonths() {
    let val = parseFloat(document.getElementById('termValue').value) || 1;
    let unit = document.getElementById('termUnit').value;
    return Math.min(600, Math.max(1, unit === 'years' ? val * 12 : val));
}

function saveCurrentValues() {
    let prop = document.getElementById('propertyPrice').value;
    let down = document.getElementById('downPayment').value;
    let termVal = document.getElementById('termValue').value;
    let termUnit = document.getElementById('termUnit').value;
    if (currentMortgageType === 'subsidized') {
        let subsidyMonths = parseInt(document.getElementById('subsidyPeriodSelect').value);
        let postRate = parseFloat(document.getElementById('postSubsidyRate').value) || 0;
        savedValues.subsidized = { propertyPrice: prop, downPayment: down, subsidyMonths, postSubsidyRate: postRate, termValue: termVal, termUnit };
    } else if (currentMortgageType === 'annuity') {
        let annRate = parseFloat(document.getElementById('interestRate').value) || 20.7;
        savedValues.annuity = { propertyPrice: prop, downPayment: down, interestRate: annRate, termValue: termVal, termUnit };
    } else {
        let trenchRate = parseFloat(document.getElementById('interestRate').value) || 20.7;
        let useMarkup = document.getElementById('trenchPriceMarkup')?.checked === true;
        savedValues.trench = { propertyPrice: prop, downPayment: down, interestRate: trenchRate, termValue: termVal, termUnit, usePriceMarkup: useMarkup };
    }
}

function loadValuesForCurrentType() {
    let vals = savedValues[currentMortgageType];
    if (!vals) vals = savedValues.annuity;
    document.getElementById('propertyPrice').value = vals.propertyPrice;
    document.getElementById('downPayment').value = vals.downPayment;
    document.getElementById('termValue').value = vals.termValue;
    document.getElementById('termUnit').value = vals.termUnit;
    if (currentMortgageType === 'subsidized') {
        document.getElementById('subsidyPeriodSelect').value = vals.subsidyMonths || 12;
        document.getElementById('postSubsidyRate').value = vals.postSubsidyRate || 20.7;
        updateSubsidyHintAndBonus();
        document.getElementById('interestRate').disabled = true;
        document.getElementById('interestRate').style.background = '#f3f4f6';
        document.getElementById('rateHintText').innerText = '(для субсидированной)';
    } else if (currentMortgageType === 'annuity') {
        document.getElementById('interestRate').value = vals.interestRate;
        document.getElementById('interestRate').disabled = false;
        document.getElementById('interestRate').style.background = '#fff';
        document.getElementById('rateHintText').innerText = '(базовая)';
        updateAnnuityRateBasedOnDownPayment();
    } else {
        document.getElementById('interestRate').value = vals.interestRate;
        document.getElementById('interestRate').disabled = false;
        document.getElementById('interestRate').style.background = '#fff';
        document.getElementById('rateHintText').innerText = '(для траншевой)';
        let chk = document.getElementById('trenchPriceMarkup');
        if (chk) chk.checked = vals.usePriceMarkup === true;
    }
    if (currentMortgageType === 'trench') renderTrenchControls();
    autoAdjustDownPayment();
    updatePrices();
}

function updateSubsidyHintAndBonus() {
    let months = parseInt(document.getElementById('subsidyPeriodSelect').value);
    let postRate = document.getElementById('postSubsidyRate').value;
    let propertyPrice = getCurrentPropertyPrice();
    let downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    let downPercent = propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;
    let isHighDown = downPercent > DISCOUNT_THRESHOLD;
    let baseRate = getBaseSubsidizedRate(months);
    let effectiveRate = isHighDown ? baseRate - 1.0 : baseRate;
    let hint = document.getElementById('subsidyHint');
    if (months === 12) {
        hint.innerHTML = isHighDown ? `✨ Льготный период: первые 12 месяцев по ставке ${effectiveRate.toFixed(1)}% (снижена на 1% за взнос >50%) → с 13 месяца: ${postRate}%` : `✨ Льготный период: первые 12 месяцев по ставке ${baseRate}% → с 13 месяца: ${postRate}%`;
    } else {
        hint.innerHTML = isHighDown ? `✨ Льготный период: первые 24 месяца по ставке ${effectiveRate.toFixed(1)}% (снижена на 1% за взнос >50%) → с 25 месяца: ${postRate}%` : `✨ Льготный период: первые 24 месяца по ставке ${baseRate}% → с 25 месяца: ${postRate}%`;
    }
    let bonusHint = document.getElementById('downpaymentBonusHint');
    if (isHighDown && currentMortgageType === 'subsidized') {
        bonusHint.style.display = 'block';
        bonusHint.innerHTML = `🏆 При взносе > 50.1% льготная ставка снижена на 1% (текущая льготная ставка: ${effectiveRate.toFixed(1)}%)`;
    } else {
        bonusHint.style.display = 'none';
    }
}

function calculateMonthlyPayment(debt, rate, months) {
    if (debt <= 0) return 0;
    if (rate === 0) return debt / months;
    if (months <= 0) return debt;
    return debt * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
}

function calculateStandardAnnuity() {
    let propertyPrice = getCurrentPropertyPrice();
    let downPaymentRaw = parseFloat(document.getElementById('downPayment').value) || 0;
    let minPercent = getCurrentMinDownPercent();
    let minDown = propertyPrice * minPercent / 100;
    let downPayment = downPaymentRaw < minDown && propertyPrice > 0 ? Math.round(minDown) : downPaymentRaw;
    if (propertyPrice > 0 && downPayment < minDown) downPayment = Math.round(minDown);
    
    let annualRate = parseFloat(document.getElementById('interestRate').value) || 20.7;
    
    let totalMonths = getTotalMonths();
    let loanAmount = Math.max(0, propertyPrice - downPayment);
    document.getElementById('loanAmount').textContent = formatMoney(loanAmount);
    if (loanAmount <= 0 || propertyPrice === 0) { clearResults(); return; }
    let monthlyRate = annualRate / 100 / 12;
    let remainingDebt = loanAmount;
    let schedule = [];
    let totalInterest = 0, totalPaid = 0;
    let earlyMap = new Map();
    earlyPayments.forEach(p => { if (!earlyMap.has(p.month)) earlyMap.set(p.month, []); earlyMap.get(p.month).push(p); });
    let currentMonthly = calculateMonthlyPayment(remainingDebt, monthlyRate, totalMonths);
    for (let month = 1; month <= totalMonths + 36 && remainingDebt > 0.01; month++) {
        let interest = remainingDebt * monthlyRate;
        let principal = Math.min(currentMonthly - interest, remainingDebt);
        if (principal < 0) principal = 0;
        remainingDebt -= principal;
        let entry = { month, payment: currentMonthly, principal, interest, remainingDebt: Math.max(0, remainingDebt), earlyPayment: 0, trenchAmount: 0 };
        let earlyList = earlyMap.get(month) || [];
        for (let ep of earlyList) {
            let amt = Math.min(ep.amount, remainingDebt);
            if (amt > 0) {
                remainingDebt -= amt;
                entry.earlyPayment += amt;
                if (ep.type === 'payment' && remainingDebt > 0) {
                    let rem = Math.max(1, totalMonths - month);
                    currentMonthly = calculateMonthlyPayment(remainingDebt, monthlyRate, rem);
                }
                if (remainingDebt <= 0) break;
            }
        }
        entry.remainingDebt = Math.max(0, remainingDebt);
        totalInterest += interest;
        totalPaid += currentMonthly + entry.earlyPayment;
        schedule.push(entry);
        if (remainingDebt <= 0.01) break;
    }
    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0]?.payment || 0);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPaid + downPayment);
    let len = schedule.length;
    document.getElementById('actualTerm').textContent = `${Math.floor(len/12)} ${getYearWord(Math.floor(len/12))} ${len%12} ${getMonthWord(len%12)}`.trim();
    renderSchedule(schedule);
}

function calculateTrench() {
    let propertyPrice = getCurrentPropertyPrice();
    let downPaymentRaw = parseFloat(document.getElementById('downPayment').value) || 0;
    let minDownPercent = MIN_DOWN_PAYMENT_TRENCH_PERCENT;
    let minDown = propertyPrice * minDownPercent / 100;
    let downPayment = downPaymentRaw < minDown ? Math.round(minDown) : downPaymentRaw;
    if (propertyPrice > 0 && downPayment < minDown) downPayment = Math.round(minDown);
    let annualRate = parseFloat(document.getElementById('interestRate').value) || 20.7;
    let monthsTotal = getTotalMonths();
    let loanAmount = propertyPrice - downPayment;
    document.getElementById('loanAmount').textContent = formatMoney(loanAmount);
    if (loanAmount <= 0) { clearResults(); return; }
    let monthlyRate = annualRate / 100 / 12;
    let activeDebt = 0;
    let schedule = [];
    let totalInterest = 0, totalPaid = 0;
    let trenchSchedule = trenches.map(t => ({ month: t.month, amount: loanAmount * t.share }));
    let first = trenchSchedule.find(t => t.month === 0);
    if (first) activeDebt = first.amount;
    let earlyMap = new Map();
    earlyPayments.forEach(p => { if (!earlyMap.has(p.month)) earlyMap.set(p.month, []); earlyMap.get(p.month).push(p); });
    let currentMonthly = activeDebt > 0 ? calculateMonthlyPayment(activeDebt, monthlyRate, monthsTotal) : 0;
    let month = 1;
    while ((activeDebt > 0.01) && month <= monthsTotal + 48) {
        let trenchAdd = 0;
        for (let t of trenchSchedule) if (t.month > 0 && t.month === month-1 && t.amount > 0) { activeDebt += t.amount; trenchAdd += t.amount; currentMonthly = calculateMonthlyPayment(activeDebt, monthlyRate, Math.max(1, monthsTotal - month + 1)); }
        let interest = activeDebt * monthlyRate;
        let principal = Math.min(currentMonthly - interest, activeDebt);
        if (principal < 0) principal = 0;
        activeDebt -= principal;
        let entry = { month, payment: currentMonthly, principal, interest, remainingDebt: Math.max(0, activeDebt), earlyPayment: 0, trenchAmount: trenchAdd };
        let earlyList = earlyMap.get(month) || [];
        for (let ep of earlyList) {
            let amt = Math.min(ep.amount, activeDebt);
            if (amt > 0) { activeDebt -= amt; entry.earlyPayment += amt; if (ep.type === 'payment' && activeDebt > 0) currentMonthly = calculateMonthlyPayment(activeDebt, monthlyRate, Math.max(1, monthsTotal - month)); }
            if (activeDebt <= 0) break;
        }
        entry.remainingDebt = Math.max(0, activeDebt);
        totalInterest += interest;
        totalPaid += currentMonthly + entry.earlyPayment;
        schedule.push(entry);
        month++;
        if (activeDebt <= 0.01) break;
    }
    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0]?.payment || 0);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPaid + downPayment);
    let len = schedule.length;
    document.getElementById('actualTerm').textContent = `${Math.floor(len/12)} ${getYearWord(Math.floor(len/12))} ${len%12} ${getMonthWord(len%12)}`.trim();
    renderSchedule(schedule);
}

function calculateSubsidized() {
    let propertyPrice = getCurrentPropertyPrice();
    let downPaymentRaw = parseFloat(document.getElementById('downPayment').value) || 0;
    let minDown = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    let downPayment = downPaymentRaw < minDown && propertyPrice > 0 ? Math.round(minDown) : downPaymentRaw;
    let subsidyMonths = parseInt(document.getElementById('subsidyPeriodSelect').value);
    let postRate = parseFloat(document.getElementById('postSubsidyRate').value) || 20.7;
    let downPercent = propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;
    let subsidizedRate = getEffectiveSubsidizedRate(subsidyMonths, downPercent);
    let totalMonths = getTotalMonths();
    let loanAmount = Math.max(0, propertyPrice - downPayment);
    document.getElementById('loanAmount').textContent = formatMoney(loanAmount);
    if (loanAmount <= 0 || propertyPrice === 0) { clearResults(); return; }
    let schedule = [];
    let remainingDebt = loanAmount;
    let totalInterest = 0, totalPaymentsSum = 0;
    let month = 1;
    let earlyMap = new Map();
    earlyPayments.forEach(p => { if (!earlyMap.has(p.month)) earlyMap.set(p.month, []); earlyMap.get(p.month).push(p); });
    let currentMonthlyPayment = null;
    let lastRate = null;
    while (remainingDebt > 0.01 && month <= totalMonths + 36) {
        let currentAnnualRate = (month <= subsidyMonths) ? subsidizedRate : postRate;
        let monthlyRate = currentAnnualRate / 100 / 12;
        let remainingMonths = Math.max(1, totalMonths - month + 1);
        if (currentMonthlyPayment === null || lastRate !== currentAnnualRate) {
            if (monthlyRate === 0) currentMonthlyPayment = remainingDebt / remainingMonths;
            else currentMonthlyPayment = remainingDebt * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
            lastRate = currentAnnualRate;
        }
        let interest = remainingDebt * monthlyRate;
        let principal = Math.min(currentMonthlyPayment - interest, remainingDebt);
        if (principal < 0) principal = 0;
        remainingDebt -= principal;
        let entry = { month, payment: currentMonthlyPayment, principal, interest, remainingDebt: Math.max(0, remainingDebt), earlyPayment: 0, trenchAmount: 0 };
        let earlyList = earlyMap.get(month) || [];
        for (let ep of earlyList) {
            let earlyAmt = Math.min(ep.amount, remainingDebt);
            if (earlyAmt > 0) {
                remainingDebt -= earlyAmt;
                entry.earlyPayment += earlyAmt;
                if (ep.type === 'payment' && remainingDebt > 0) {
                    let rem = Math.max(1, totalMonths - month);
                    let newRate = (month+1 <= subsidyMonths ? subsidizedRate : postRate) / 100 / 12;
                    if (remainingDebt > 0 && newRate > 0) {
                        currentMonthlyPayment = remainingDebt * newRate * Math.pow(1+newRate, rem) / (Math.pow(1+newRate, rem)-1);
                    } else if (remainingDebt > 0) currentMonthlyPayment = remainingDebt / rem;
                    entry.payment = currentMonthlyPayment;
                }
                if (remainingDebt <= 0) break;
            }
        }
        entry.remainingDebt = Math.max(0, remainingDebt);
        totalInterest += interest;
        totalPaymentsSum += currentMonthlyPayment + entry.earlyPayment;
        schedule.push(entry);
        month++;
        if (remainingDebt <= 0.01) break;
    }
    let actualMonths = schedule.length;
    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0]?.payment || 0);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPaymentsSum + downPayment);
    let years = Math.floor(actualMonths / 12), monthsRem = actualMonths % 12;
    document.getElementById('actualTerm').textContent = `${years} ${getYearWord(years)} ${monthsRem} ${getMonthWord(monthsRem)}`.trim();
    renderSchedule(schedule);
}

function clearResults() {
    document.getElementById('monthlyPayment').textContent = '0 ₽';
    document.getElementById('totalOverpayment').textContent = '0 ₽';
    document.getElementById('totalPayment').textContent = '0 ₽';
    document.getElementById('actualTerm').textContent = '0 месяцев';
    renderSchedule([]);
}

function calculateMortgage() {
    if (currentMortgageType === 'trench') calculateTrench();
    else if (currentMortgageType === 'subsidized') calculateSubsidized();
    else calculateStandardAnnuity();
    if (currentMortgageType === 'subsidized') updateSubsidyHintAndBonus();
}

function renderSchedule(schedule) {
    let tbody = document.getElementById('scheduleBody');
    if (!schedule.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Нет данных</td</ea>'; return; }
    let html = '';
    for (let m of schedule) {
        let hasEp = earlyPayments.some(ep => ep.month === m.month);
        let epData = earlyPayments.find(ep => ep.month === m.month);
        let epTypeText = epData ? (epData.type === 'term' ? '(срок)' : '(платёж)') : '';
        let earlyDisplay = m.earlyPayment > 0 ? formatMoney(m.earlyPayment) : (hasEp ? 'запланировано' : '—');
        html += `<tr onclick="openModal(${m.month}, ${Math.round(m.remainingDebt)})" class="${m.earlyPayment > 0 ? 'early-payment-row' : ''}">
                    <td style="text-align:center;">${m.month}</td>
                    <td class="text-right">${formatMoney(m.payment)}</td>
                    <td class="text-right">${formatMoney(m.principal)}</td>
                    <td class="text-right">${formatMoney(m.interest)}</td>
                    <td class="text-right">${formatMoney(m.remainingDebt)}</td>
                    <td class="text-right">${earlyDisplay} ${epTypeText ? `<div><small>${epTypeText}</small></div>` : ''}</td>
                    <td class="text-right">${m.trenchAmount ? formatMoney(m.trenchAmount) : '—'}</td>
                </tr>`;
    }
    tbody.innerHTML = html;
}

function renderTrenchControls() {
    let prop = getCurrentPropertyPrice();
    let down = parseFloat(document.getElementById('downPayment').value) || 0;
    let loan = Math.max(0, prop - down);
    let html = '';
    trenches.forEach((t) => {
        let amount = loan * t.share;
        let name = t.month === 0 ? 'Транш 1 (в день сделки)' : (t.month === 4 ? 'Транш 2 (через 4 мес.)' : (t.month === 8 ? 'Транш 3 (через 8 мес.)' : 'Транш 4 (через 12 мес.)'));
        html += `<div class="trench-row-edit"><label>${name}:</label><input type="text" value="${formatMoney(amount)}" readonly><div style="font-size:11px; color:#2c6e2c;"></div></div>`;
    });
    document.getElementById('trenchControls').innerHTML = html;
}

function onMortgageTypeChange() {
    saveCurrentValues();
    let radios = document.querySelectorAll('input[name="mortgageType"]');
    for (let r of radios) if (r.checked) currentMortgageType = r.value;
    document.getElementById('trenchInfo').style.display = currentMortgageType === 'trench' ? 'block' : 'none';
    document.getElementById('subsidizedInfo').style.display = currentMortgageType === 'subsidized' ? 'block' : 'none';
    
    let optionLabel = document.getElementById('trenchPriceOptionLabel');
    if (currentMortgageType === 'trench') {
        optionLabel.style.display = 'inline-flex';
    } else {
        optionLabel.style.display = 'none';
    }
    
    if (currentMortgageType === 'subsidized') {
        document.getElementById('interestRate').disabled = true;
        document.getElementById('interestRate').style.background = '#f3f4f6';
        document.getElementById('rateHintText').innerText = '(для субсидированной)';
    } else {
        document.getElementById('interestRate').disabled = false;
        document.getElementById('interestRate').style.background = '#fff';
        document.getElementById('rateHintText').innerText = currentMortgageType === 'trench' ? '(для траншевой)' : '(базовая)';
    }
    loadValuesForCurrentType();
    calculateMortgage();
}

function openModal(month, debt) {
    currentEditMonth = month;
    currentRemainingDebtForModal = debt;
    let existing = earlyPayments.find(ep => ep.month === month);
    document.getElementById('earlyAmount').value = existing ? existing.amount : Math.min(100000, debt);
    document.getElementById('earlyType').value = existing ? existing.type : 'term';
    document.getElementById('fullCloseInfo').innerHTML = `Остаток долга: ${formatMoney(debt)}`;
    document.getElementById('deleteBtn').style.display = existing ? 'block' : 'none';
    document.getElementById('earlyModal').style.display = 'flex';
}
window.openModal = openModal;
function closeModal() { document.getElementById('earlyModal').style.display = 'none'; currentEditMonth = null; }
window.closeModal = closeModal;
function saveEarlyPayment() {
    let amount = parseFloat(document.getElementById('earlyAmount').value);
    let type = document.getElementById('earlyType').value;
    if (isNaN(amount) || amount <= 0) return alert('Введите сумму');
    let existing = earlyPayments.findIndex(ep => ep.month === currentEditMonth);
    if (existing >= 0) earlyPayments[existing] = { month: currentEditMonth, amount, type };
    else earlyPayments.push({ month: currentEditMonth, amount, type });
    earlyPayments.sort((a,b)=>a.month-b.month);
    closeModal();
    calculateMortgage();
}
window.saveEarlyPayment = saveEarlyPayment;
function deleteEarlyPayment() { earlyPayments = earlyPayments.filter(ep => ep.month !== currentEditMonth); closeModal(); calculateMortgage(); }
window.deleteEarlyPayment = deleteEarlyPayment;
function setFullCloseAmount() { if (currentRemainingDebtForModal > 0) document.getElementById('earlyAmount').value = Math.ceil(currentRemainingDebtForModal); }
window.setFullCloseAmount = setFullCloseAmount;
document.getElementById('fullCloseBtn').addEventListener('click', setFullCloseAmount);
function getYearWord(y) { if (y%10===1 && y%100!==11) return 'год'; if ([2,3,4].includes(y%10) && ![12,13,14].includes(y%100)) return 'года'; return 'лет'; }
function getMonthWord(m) { if (m%10===1 && m%100!==11) return 'месяц'; if ([2,3,4].includes(m%10) && ![12,13,14].includes(m%100)) return 'месяца'; return 'месяцев'; }

document.getElementById('basePrice').addEventListener('input', updatePrices);
document.getElementById('discountPercent').addEventListener('input', updatePrices);
document.getElementById('discountRub').addEventListener('input', updatePrices);
document.getElementById('trenchPriceMarkup').addEventListener('change', () => { updatePrices(); saveCurrentValues(); });
document.getElementById('propertyPrice').addEventListener('input', () => { autoAdjustDownPayment(); calculateMortgage(); saveCurrentValues(); });
document.getElementById('downPayment').addEventListener('input', () => { 
    let propertyPrice = getCurrentPropertyPrice();
    let downVal = parseFloat(document.getElementById('downPayment').value) || 0;
    if (propertyPrice > 0 && downVal > propertyPrice) {
        document.getElementById('downPayment').value = Math.round(propertyPrice);
    }
    updateAnnuityRateBasedOnDownPayment();
    calculateMortgage(); 
    saveCurrentValues(); 
    if(currentMortgageType==='trench') renderTrenchControls(); 
    if(currentMortgageType==='subsidized') updateSubsidyHintAndBonus();
});
document.getElementById('interestRate').addEventListener('input', () => { calculateMortgage(); saveCurrentValues(); });
document.getElementById('postSubsidyRate').addEventListener('input', () => { if(currentMortgageType==='subsidized') { updateSubsidyHintAndBonus(); calculateMortgage(); saveCurrentValues(); } });
document.getElementById('subsidyPeriodSelect').addEventListener('change', () => { if(currentMortgageType==='subsidized') { updateSubsidyHintAndBonus(); calculateMortgage(); saveCurrentValues(); } });
document.getElementById('termValue').addEventListener('input', () => { calculateMortgage(); saveCurrentValues(); });
document.getElementById('termUnit').addEventListener('change', () => { calculateMortgage(); saveCurrentValues(); });
document.querySelectorAll('input[name="mortgageType"]').forEach(r => r.addEventListener('change', onMortgageTypeChange));

window.onload = () => { updatePrices(); onMortgageTypeChange(); };