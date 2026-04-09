let earlyPayments = [];
let currentMortgageType = 'annuity';
let currentEditMonth = null;
let currentRemainingDebtForModal = 0;
const MIN_DOWN_PAYMENT_PERCENT = 20.1;

let annuityValues = {
    propertyPrice: '',
    downPayment: '',
    interestRate: 20.7,
    termValue: 30,
    termUnit: 'years'
};

let trenchValues = {
    propertyPrice: '',
    downPayment: '',
    interestRate: 20.7,
    termValue: 30,
    termUnit: 'years'
};

let trenches = [
    { month: 0, share: 0.253 },   
    { month: 4, share: 0.249 },   
    { month: 8, share: 0.249 },   
    { month: 12, share: 0.249 }   
];

function saveCurrentValues() {
    let propertyPrice = document.getElementById('propertyPrice').value;
    let downPayment = document.getElementById('downPayment').value;
    let interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    let termValue = parseFloat(document.getElementById('termValue').value) || 1;
    let termUnit = document.getElementById('termUnit').value;
    
    if (currentMortgageType === 'annuity') {
        annuityValues = { propertyPrice, downPayment, interestRate, termValue, termUnit };
    } else {
        trenchValues = { propertyPrice, downPayment, interestRate, termValue, termUnit };
    }
}

function loadValuesForCurrentType() {
    let values = currentMortgageType === 'annuity' ? annuityValues : trenchValues;
    
    document.getElementById('propertyPrice').value = values.propertyPrice;
    document.getElementById('downPayment').value = values.downPayment;
    document.getElementById('interestRate').value = values.interestRate;
    document.getElementById('termValue').value = values.termValue;
    document.getElementById('termUnit').value = values.termUnit;
}

function setMinDownPayment() {
    let propertyPrice = parseFloat(document.getElementById('propertyPrice').value) || 0;
    let downPaymentInput = document.getElementById('downPayment');
    
    if (propertyPrice > 0) {
        let minDownPayment = Math.round(propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100);
        let currentDownPayment = parseFloat(downPaymentInput.value) || 0;
        
        if (currentDownPayment === 0 || currentDownPayment < minDownPayment) {
            downPaymentInput.value = minDownPayment;
        }
    }
}

function getTotalMonths() {
    let termValue = parseFloat(document.getElementById('termValue').value) || 1;
    let termUnit = document.getElementById('termUnit').value;
    
    if (termUnit === 'years') {
        return Math.min(600, Math.max(1, termValue * 12));
    } else {
        return Math.min(600, Math.max(1, termValue));
    }
}

function setFullCloseAmount() {
    let earlyAmountInput = document.getElementById('earlyAmount');
    let fullCloseInfo = document.getElementById('fullCloseInfo');
    
    if (currentRemainingDebtForModal > 0) {
        earlyAmountInput.value = Math.round(currentRemainingDebtForModal);
        fullCloseInfo.innerHTML = `Сумма для полного закрытия: ${formatMoney(currentRemainingDebtForModal)}`;
        fullCloseInfo.style.color = '#d4a017';
        fullCloseInfo.style.fontWeight = 'bold';
    } else {
        fullCloseInfo.innerHTML = 'Нет данных о remainingDebt';
        fullCloseInfo.style.color = '#c44';
    }
}

function openModal(month, currentDebt) {
    currentEditMonth = month;
    currentRemainingDebtForModal = currentDebt;
    let existing = earlyPayments.find(ep => ep.month === month);
    document.getElementById('modalTitle').innerHTML = `Досрочное погашение - месяц ${month}`;
    document.getElementById('earlyAmount').value = existing ? existing.amount : Math.min(100000, currentDebt);
    document.getElementById('earlyType').value = existing ? existing.type : 'term';
    
    let fullCloseInfo = document.getElementById('fullCloseInfo');
    fullCloseInfo.innerHTML = `Остаток долга: ${formatMoney(currentDebt)}`;
    fullCloseInfo.style.color = '#666';
    fullCloseInfo.style.fontWeight = 'normal';
    
    let deleteBtn = document.getElementById('deleteBtn');
    if (existing) {
        deleteBtn.style.display = 'block';
    } else {
        deleteBtn.style.display = 'none';
    }
    
    document.getElementById('earlyModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('earlyModal').style.display = 'none';
    currentEditMonth = null;
    currentRemainingDebtForModal = 0;
}

function saveEarlyPayment() {
    let amount = parseFloat(document.getElementById('earlyAmount').value);
    let type = document.getElementById('earlyType').value;
    
    if (isNaN(amount) || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    let existingIndex = earlyPayments.findIndex(ep => ep.month === currentEditMonth);
    if (existingIndex >= 0) {
        earlyPayments[existingIndex].amount = amount;
        earlyPayments[existingIndex].type = type;
    } else {
        earlyPayments.push({ month: currentEditMonth, amount: amount, type: type });
    }
    
    earlyPayments.sort((a, b) => a.month - b.month);
    closeModal();
    calculateMortgage();
}

function deleteEarlyPayment() {
    earlyPayments = earlyPayments.filter(ep => ep.month !== currentEditMonth);
    closeModal();
    calculateMortgage();
}

function updateTrenchSharesFromDownPayment() {
}

function renderTrenchControls() {
    const container = document.getElementById('trenchControls');
    let propertyPrice = Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0);
    let downPayment = Math.min(propertyPrice, Math.max(0, parseFloat(document.getElementById('downPayment').value) || 0));
    
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    if (downPayment < minDownPayment) {
        downPayment = minDownPayment;
    }
    
    let loanAmount = propertyPrice - downPayment;
    
    let html = '';
    trenches.forEach((trench, idx) => {
        let amount = loanAmount * trench.share;
        let monthName = '';
        let percentValue = (trench.share * 100).toFixed(1);
        if (trench.month === 0) monthName = 'Транш 1 (в день сделки)';
        else if (trench.month === 4) monthName = 'Транш 2 (через 4 мес.)';
        else if (trench.month === 8) monthName = 'Транш 3 (через 8 мес.)';
        else monthName = 'Транш 4 (через 12 мес.)';
        
        html += `
            <div class="trench-row-edit">
                <label>${monthName}:</label>
                <input type="text" value="${formatMoney(amount)}" readonly style="background:#f0f0f0">
в            </div>
        `;
    });
    container.innerHTML = html;
}

function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU') + ' ₽';
}

function validateAndFixDownPayment() {
    let propertyPrice = Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0);
    let downPaymentInput = document.getElementById('downPayment');
    let userValue = parseFloat(downPaymentInput.value) || 0;
    let downPayment = Math.min(propertyPrice, Math.max(0, userValue));
    
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    
    if (downPayment < minDownPayment && propertyPrice > 0) {
        downPaymentInput.classList.add('error-border');
    } else {
        downPaymentInput.classList.remove('error-border');
    }
    
    return downPayment;
}

function calculateMonthlyPayment(debt, rate, remainingMonths) {
    if (debt <= 0) return 0;
    if (rate === 0) return debt / remainingMonths;
    if (remainingMonths <= 0) return debt;
    return debt * rate * Math.pow(1 + rate, remainingMonths) / (Math.pow(1 + rate, remainingMonths) - 1);
}

function calculateMortgage() {
    let propertyPrice = Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0);
    let downPaymentRaw = Math.min(propertyPrice, Math.max(0, parseFloat(document.getElementById('downPayment').value) || 0));
    
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    let downPayment = downPaymentRaw;
    
    if (downPayment < minDownPayment && propertyPrice > 0) {
        downPayment = minDownPayment;
    }
    
    let annualRate = Math.max(0.01, parseFloat(document.getElementById('interestRate').value) || 0);
    let monthsTotal = getTotalMonths();

    const totalLoanAmount = Math.max(0, propertyPrice - downPayment);
    document.getElementById('loanAmount').textContent = formatMoney(totalLoanAmount);

    if (totalLoanAmount <= 0 || propertyPrice === 0) {
        document.getElementById('monthlyPayment').textContent = '0 ₽';
        document.getElementById('totalOverpayment').textContent = '0 ₽';
        document.getElementById('totalPayment').textContent = formatMoney(propertyPrice);
        document.getElementById('actualTerm').textContent = '0 месяцев';
        renderSchedule([]);
        return;
    }

    let monthlyRate = annualRate / 100 / 12;

    if (currentMortgageType === 'annuity') {
        calculateAnnuity(totalLoanAmount, monthlyRate, monthsTotal, downPayment);
    } else {
        renderTrenchControls();
        calculateTrench(totalLoanAmount, monthlyRate, monthsTotal, downPayment);
    }
}

function calculateAnnuity(loanAmount, monthlyRate, monthsTotal, downPayment) {
    let remainingDebt = loanAmount;
    let schedule = [];
    let totalInterest = 0;
    let totalPayment = 0;
    let currentMonth = 1;

    let sortedEarlyPayments = [...earlyPayments].sort((a, b) => a.month - b.month);
    let earlyPaymentsMap = new Map();
    sortedEarlyPayments.forEach(p => {
        if (!earlyPaymentsMap.has(p.month)) earlyPaymentsMap.set(p.month, []);
        earlyPaymentsMap.get(p.month).push({ ...p });
    });

    let currentMonthlyPayment = calculateMonthlyPayment(remainingDebt, monthlyRate, monthsTotal);
    let maxIterations = monthsTotal * 2;

    while (remainingDebt > 0.01 && currentMonth <= maxIterations) {
        let remainingMonths = Math.max(1, monthsTotal - currentMonth + 1);
        let monthlyPayment = currentMonthlyPayment;
        if (remainingDebt > 0 && monthlyPayment === 0) {
            monthlyPayment = calculateMonthlyPayment(remainingDebt, monthlyRate, remainingMonths);
            currentMonthlyPayment = monthlyPayment;
        }

        let interestPayment = remainingDebt * monthlyRate;
        let principalPayment = Math.min(monthlyPayment - interestPayment, remainingDebt);
        if (principalPayment < 0) principalPayment = 0;

        remainingDebt -= principalPayment;

        let scheduleEntry = {
            month: currentMonth,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remainingDebt: Math.max(0, remainingDebt),
            earlyPayment: 0,
            trenchAmount: 0
        };

        let earlyPaymentsThisMonth = earlyPaymentsMap.get(currentMonth) || [];
        for (let ep of earlyPaymentsThisMonth) {
            let earlyAmount = Math.min(ep.amount, remainingDebt);
            if (earlyAmount > 0) {
                remainingDebt -= earlyAmount;
                scheduleEntry.earlyPayment += earlyAmount;
                if (ep.type === 'payment') {
                    let remMonths = Math.max(1, monthsTotal - currentMonth);
                    if (remainingDebt > 0 && monthlyRate > 0) {
                        currentMonthlyPayment = calculateMonthlyPayment(remainingDebt, monthlyRate, remMonths);
                    } else if (remainingDebt > 0) {
                        currentMonthlyPayment = remainingDebt / remMonths;
                    }
                }
            }
        }
        scheduleEntry.remainingDebt = Math.max(0, remainingDebt);
        totalInterest += interestPayment;
        totalPayment += monthlyPayment + scheduleEntry.earlyPayment;
        schedule.push(scheduleEntry);
        currentMonth++;
        if (remainingDebt <= 0.01) break;
    }

    displayResults(schedule, totalInterest, totalPayment, downPayment);
    renderSchedule(schedule);
}

function calculateTrench(totalLoanAmount, monthlyRate, monthsTotal, downPayment) {
    let activeDebt = 0;
    let schedule = [];
    let totalInterest = 0;
    let totalPayment = 0;
    let currentMonth = 1;

    let trenchSchedule = [];
    for (let trench of trenches) {
        let amount = totalLoanAmount * trench.share;
        if (amount > 0) {
            trenchSchedule.push({ month: trench.month, amount: amount });
        }
    }

    let firstTrench = trenchSchedule.find(t => t.month === 0);
    if (firstTrench && firstTrench.amount > 0) {
        activeDebt = firstTrench.amount;
    }

    let sortedEarlyPayments = [...earlyPayments].sort((a, b) => a.month - b.month);
    let earlyPaymentsMap = new Map();
    sortedEarlyPayments.forEach(p => {
        if (!earlyPaymentsMap.has(p.month)) earlyPaymentsMap.set(p.month, []);
        earlyPaymentsMap.get(p.month).push({ ...p });
    });

    let currentMonthlyPayment = 0;
    
    if (activeDebt > 0) {
        currentMonthlyPayment = calculateMonthlyPayment(activeDebt, monthlyRate, monthsTotal);
    }

    let monthCounter = 1;
    let maxMonths = monthsTotal + 24;

    while (activeDebt > 0.01 && monthCounter <= maxMonths) {
        let trenchAdded = 0;
        
        for (let trench of trenchSchedule) {
            if (trench.month > 0 && trench.month === monthCounter - 1 && trench.amount > 0) {
                activeDebt += trench.amount;
                trenchAdded += trench.amount;
                let remainingMonths = Math.max(1, monthsTotal - monthCounter + 1);
                currentMonthlyPayment = calculateMonthlyPayment(activeDebt, monthlyRate, remainingMonths);
            }
        }

        let interestPayment = activeDebt * monthlyRate;
        let principalPayment = Math.min(currentMonthlyPayment - interestPayment, activeDebt);
        if (principalPayment < 0) principalPayment = 0;
        
        activeDebt -= principalPayment;

        let scheduleEntry = {
            month: monthCounter,
            payment: currentMonthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remainingDebt: Math.max(0, activeDebt),
            earlyPayment: 0,
            trenchAmount: trenchAdded
        };

        let earlyPaymentsThisMonth = earlyPaymentsMap.get(monthCounter) || [];
        for (let ep of earlyPaymentsThisMonth) {
            let earlyAmount = Math.min(ep.amount, activeDebt);
            if (earlyAmount > 0) {
                activeDebt -= earlyAmount;
                scheduleEntry.earlyPayment += earlyAmount;
                if (ep.type === 'payment') {
                    let remMonths = Math.max(1, monthsTotal - monthCounter);
                    if (activeDebt > 0 && monthlyRate > 0) {
                        currentMonthlyPayment = calculateMonthlyPayment(activeDebt, monthlyRate, remMonths);
                    } else if (activeDebt > 0) {
                        currentMonthlyPayment = activeDebt / remMonths;
                    }
                }
            }
        }
        
        scheduleEntry.remainingDebt = Math.max(0, activeDebt);
        totalInterest += interestPayment;
        totalPayment += currentMonthlyPayment + scheduleEntry.earlyPayment;
        schedule.push(scheduleEntry);
        
        monthCounter++;
        
        if (activeDebt <= 0.01) break;
    }

    displayResults(schedule, totalInterest, totalPayment, downPayment);
    renderSchedule(schedule);
}

function displayResults(schedule, totalInterest, totalPayment, downPayment) {
    if (schedule.length === 0) {
        document.getElementById('monthlyPayment').textContent = '0 ₽';
        document.getElementById('totalOverpayment').textContent = '0 ₽';
        document.getElementById('totalPayment').textContent = formatMoney(downPayment);
        document.getElementById('actualTerm').textContent = '0 месяцев';
        return;
    }

    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0].payment);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPayment + downPayment);

    let actualMonths = schedule.length;
    let yearsVal = Math.floor(actualMonths / 12);
    let monthsVal = actualMonths % 12;
    let termText = '';
    if (yearsVal > 0) termText += `${yearsVal} ${getYearWord(yearsVal)}`;
    if (monthsVal > 0) termText += ` ${monthsVal} ${getMonthWord(monthsVal)}`;
    if (termText === '') termText = '0 месяцев';
    document.getElementById('actualTerm').textContent = termText;
}

function renderSchedule(schedule) {
    const tbody = document.getElementById('scheduleBody');
    if (schedule.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Введите параметры для расчета</td</ea>';
        return;
    }

    let html = '';
    for (let month of schedule) {
        let hasEarlyPayment = earlyPayments.some(ep => ep.month === month.month);
        let earlyPaymentData = earlyPayments.find(ep => ep.month === month.month);
        let earlyTypeText = '';
        if (earlyPaymentData) {
            earlyTypeText = earlyPaymentData.type === 'term' ? '(срок)' : '(платёж)';
        }
        
        let rowClass = '';
        if (month.earlyPayment > 0) rowClass = 'early-payment-row';
        if (month.trenchAmount > 0) rowClass = 'trench-row';
        let trenchDisplay = month.trenchAmount > 0 ? formatMoney(month.trenchAmount) : '—';
        let earlyDisplay = month.earlyPayment > 0 ? formatMoney(month.earlyPayment) : (hasEarlyPayment ? 'запланировано' : '—');
        
        html += `
            <tr class="${rowClass}" onclick="openModal(${month.month}, ${Math.round(month.remainingDebt)})">
                <td style="text-align: center;">${month.month}</td>
                <td class="text-right">${formatMoney(month.payment)}</td>
                <td class="text-right">${formatMoney(month.principal)}</td>
                <td class="text-right">${formatMoney(month.interest)}</td>
                <td class="text-right">${formatMoney(month.remainingDebt)}</td>
                <td class="text-right">
                    ${earlyDisplay}
                    ${hasEarlyPayment ? `<div><small>${earlyTypeText}</small></div>` : ''}
                </td>
                <td class="text-right">${trenchDisplay}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function getYearWord(years) {
    if (years % 10 === 1 && years % 100 !== 11) return 'год';
    if ([2,3,4].includes(years % 10) && ![12,13,14].includes(years % 100)) return 'года';
    return 'лет';
}

function getMonthWord(months) {
    if (months % 10 === 1 && months % 100 !== 11) return 'месяц';
    if ([2,3,4].includes(months % 10) && ![12,13,14].includes(months % 100)) return 'месяца';
    return 'месяцев';
}

function onMortgageTypeChange() {
    saveCurrentValues();
    
    let radios = document.querySelectorAll('input[name="mortgageType"]');
    for (let radio of radios) {
        if (radio.checked) {
            currentMortgageType = radio.value;
            break;
        }
    }
    
    loadValuesForCurrentType();
    
    const trenchInfo = document.getElementById('trenchInfo');
    trenchInfo.style.display = currentMortgageType === 'trench' ? 'block' : 'none';
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
}

window.onclick = function(event) {
    let modal = document.getElementById('earlyModal');
    if (event.target === modal) {
        closeModal();
    }
}

document.getElementById('propertyPrice').addEventListener('input', () => {
    setMinDownPayment();
    validateAndFixDownPayment();
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('downPayment').addEventListener('input', () => {
    validateAndFixDownPayment();
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('downPayment').addEventListener('blur', function() {
    let propertyPrice = Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0);
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    let currentValue = parseFloat(this.value) || 0;
    
    if (currentValue < minDownPayment && propertyPrice > 0) {
        this.value = Math.round(minDownPayment);
        if (currentMortgageType === 'trench') {
            renderTrenchControls();
        }
        calculateMortgage();
        saveCurrentValues();
    }
});

document.getElementById('interestRate').addEventListener('input', () => {
    calculateMortgage();
    saveCurrentValues();
});
document.getElementById('termValue').addEventListener('input', () => {
    calculateMortgage();
    saveCurrentValues();
});
document.getElementById('termUnit').addEventListener('change', () => {
    calculateMortgage();
    saveCurrentValues();
});

let radios = document.querySelectorAll('input[name="mortgageType"]');
radios.forEach(radio => radio.addEventListener('change', onMortgageTypeChange));

window.onload = function() {
    currentMortgageType = 'annuity';
    document.querySelector('input[value="annuity"]').checked = true;
    document.getElementById('trenchInfo').style.display = 'none';
    loadValuesForCurrentType();
    calculateMortgage();
};