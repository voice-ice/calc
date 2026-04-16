let earlyPayments = [];
let currentMortgageType = 'annuity';
let currentEditMonth = null;
let currentRemainingDebtForModal = 0;
const MIN_DOWN_PAYMENT_PERCENT = 20.1;
const DISCOUNT_RATE = 19.7;
const STANDARD_RATE = 20.7;
const DISCOUNT_THRESHOLD = 50.1;
const DVOU_PERCENT = 3;

let annuityValues = {
    propertyPrice: '0',
    downPayment: '0',
    interestRate: 20.7,
    termValue: 30,
    termUnit: 'years'
};

let trenchValues = {
    propertyPrice: '0',
    downPayment: '0',
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

function updatePrices() {
    let basePrice = parseFloat(document.getElementById('basePrice').value) || 0;
    let discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    let discountRub = parseFloat(document.getElementById('discountRub').value) || 0;
    
    let discountFromPercent = basePrice * (discountPercent / 100);
    let discountedPrice = Math.max(0, basePrice - discountFromPercent - discountRub);
    let dvou = discountedPrice * DVOU_PERCENT / 100;
    let propertyPrice = discountedPrice - dvou;
    
    document.getElementById('discountedPrice').value = Math.round(discountedPrice);
    document.getElementById('dvou').value = Math.round(dvou);
    document.getElementById('propertyPrice').value = Math.round(Math.max(0, propertyPrice));
    
    setMinDownPayment();
    
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
}

function updateInterestRateByDownPayment() {
    let propertyPrice = getCurrentPropertyPrice();
    let downPayment = Math.max(0, parseFloat(document.getElementById('downPayment').value) || 0);
    let interestRateInput = document.getElementById('interestRate');
    let rateInfo = document.getElementById('rateInfo');
    
    if (propertyPrice > 0) {
        let downPaymentPercent = (downPayment / propertyPrice) * 100;
        
        if (downPaymentPercent > DISCOUNT_THRESHOLD) {
            if (parseFloat(interestRateInput.value) !== DISCOUNT_RATE) {
                interestRateInput.value = DISCOUNT_RATE;
                if (rateInfo) rateInfo.classList.add('show');
            }
        } else {
            if (parseFloat(interestRateInput.value) === DISCOUNT_RATE) {
                interestRateInput.value = STANDARD_RATE;
                if (rateInfo) rateInfo.classList.remove('show');
            } else {
                if (rateInfo) rateInfo.classList.remove('show');
            }
        }
    } else {
        if (rateInfo) rateInfo.classList.remove('show');
    }
}

function getCurrentPropertyPrice() {
    return Math.max(0, parseFloat(document.getElementById('propertyPrice').value) || 0);
}

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
    
    updateInterestRateByDownPayment();
}

function setMinDownPayment() {
    let propertyPrice = getCurrentPropertyPrice();
    let downPaymentInput = document.getElementById('downPayment');
    
    if (propertyPrice > 0) {
        let minDownPayment = Math.round(propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100);
        let currentDownPayment = parseFloat(downPaymentInput.value) || 0;
        
        if (currentDownPayment === 0 || currentDownPayment < minDownPayment) {
            downPaymentInput.value = minDownPayment;
        }
    } else {
        downPaymentInput.value = 0;
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
        let closeAmount = Math.ceil(currentRemainingDebtForModal * 1.01);
        earlyAmountInput.value = Math.round(closeAmount);
        fullCloseInfo.innerHTML = `Сумма для полного закрытия (с учетом процентов): ${formatMoney(closeAmount)}`;
        fullCloseInfo.style.color = '#d4a017';
        fullCloseInfo.style.fontWeight = 'bold';
    } else {
        fullCloseInfo.innerHTML = 'Нет данных об остатке долга';
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

function renderTrenchControls() {
    const container = document.getElementById('trenchControls');
    let propertyPrice = getCurrentPropertyPrice();
    let downPayment = Math.min(propertyPrice, Math.max(0, parseFloat(document.getElementById('downPayment').value) || 0));
    let annualRate = Math.max(0.01, parseFloat(document.getElementById('interestRate').value) || 0);
    let monthsTotal = getTotalMonths();
    let monthlyRate = annualRate / 100 / 12;
    
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    if (downPayment < minDownPayment) {
        downPayment = minDownPayment;
    }
    
    let loanAmount = propertyPrice - downPayment;
    
    let trenchPayments = [];
    let accumulatedDebt = 0;
    
    for (let i = 0; i < trenches.length; i++) {
        let trench = trenches[i];
        let amount = loanAmount * trench.share;
        accumulatedDebt += amount;
        
        let remainingMonths = Math.max(1, monthsTotal - trench.month);
        let monthlyPayment = 0;
        
        if (accumulatedDebt > 0) {
            if (monthlyRate === 0) {
                monthlyPayment = accumulatedDebt / remainingMonths;
            } else {
                monthlyPayment = accumulatedDebt * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
            }
        }
        
        trenchPayments.push({
            month: trench.month,
            payment: monthlyPayment,
            debt: accumulatedDebt
        });
    }
    
    let html = '';
    trenches.forEach((trench, idx) => {
        let amount = loanAmount * trench.share;
        let monthName = '';
        let percentValue = (trench.share * 100).toFixed(1);
        
        if (trench.month === 0) monthName = 'Транш 1 (в день сделки)';
        else if (trench.month === 4) monthName = 'Транш 2 (через 4 мес.)';
        else if (trench.month === 8) monthName = 'Транш 3 (через 8 мес.)';
        else monthName = 'Транш 4 (через 12 мес.)';
        
        let paymentValue = trenchPayments[idx] && trenchPayments[idx].payment > 0 ? formatMoney(trenchPayments[idx].payment) : '0 ₽';
        
        html += `
            <div class="trench-row-edit">
                <label>${monthName}:</label>
                <input type="text" value="${formatMoney(amount)}" readonly style="background:#f0f0f0;">
                <input type="text" value="${paymentValue}" readonly style="background:#e8f0fe; font-weight:bold; color:#2c6e2c;">
                <div style="font-size: 11px; color:#2c6e2c;">платёж</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU') + ' ₽';
}

function validateAndFixDownPayment() {
    let propertyPrice = getCurrentPropertyPrice();
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
    let propertyPrice = getCurrentPropertyPrice();
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
        let isClosed = false;
        
        for (let ep of earlyPaymentsThisMonth) {
            let earlyAmount = Math.min(ep.amount, remainingDebt);
            if (earlyAmount > 0) {
                remainingDebt -= earlyAmount;
                scheduleEntry.earlyPayment += earlyAmount;
                
                if (remainingDebt <= 0.01) {
                    isClosed = true;
                    scheduleEntry.remainingDebt = 0;
                    break;
                }
                
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
        
        if (remainingDebt <= 0.01 || isClosed) {
            break;
        }
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
    let remainingMonths = monthsTotal;
    
    if (activeDebt > 0) {
        currentMonthlyPayment = calculateMonthlyPayment(activeDebt, monthlyRate, remainingMonths);
    }

    let monthCounter = 1;
    let maxMonths = monthsTotal + 24;

    while (activeDebt > 0.01 && monthCounter <= maxMonths) {
        let trenchAdded = 0;
        
        for (let trench of trenchSchedule) {
            if (trench.month > 0 && trench.month === monthCounter - 1 && trench.amount > 0) {
                activeDebt += trench.amount;
                trenchAdded += trench.amount;
                remainingMonths = Math.max(1, monthsTotal - monthCounter + 1);
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
        let isClosed = false;
        
        for (let ep of earlyPaymentsThisMonth) {
            let earlyAmount = Math.min(ep.amount, activeDebt);
            if (earlyAmount > 0) {
                activeDebt -= earlyAmount;
                scheduleEntry.earlyPayment += earlyAmount;
                
                if (activeDebt <= 0.01) {
                    isClosed = true;
                    scheduleEntry.remainingDebt = 0;
                    break;
                }
                
                if (ep.type === 'term') {
                    let fixedPayment = currentMonthlyPayment;
                    
                    if (activeDebt > 0 && monthlyRate > 0 && fixedPayment > activeDebt * monthlyRate) {
                        let newMonths = Math.log(fixedPayment / (fixedPayment - activeDebt * monthlyRate)) / Math.log(1 + monthlyRate);
                        remainingMonths = Math.max(1, Math.ceil(newMonths));
                    } else {
                        remainingMonths = Math.max(1, Math.ceil(activeDebt / fixedPayment));
                    }
                    
                    remainingMonths = Math.min(remainingMonths, monthsTotal * 2);
                    currentMonthlyPayment = fixedPayment;
                }
                else if (ep.type === 'payment') {
                    let remMonths = Math.max(1, remainingMonths);
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
        
        if (activeDebt <= 0.01 || isClosed) {
            break;
        }
        
        monthCounter++;
        
        if (activeDebt <= 0.01) break;
    }

    let actualMonths = 0;
    let tempDebt = totalLoanAmount;
    let tempRemainingMonths = monthsTotal;
    let tempMonthlyPayment = calculateMonthlyPayment(tempDebt, monthlyRate, tempRemainingMonths);
    let tempMonth = 1;
    let tempEarlyMap = new Map();
    sortedEarlyPayments.forEach(p => {
        if (!tempEarlyMap.has(p.month)) tempEarlyMap.set(p.month, []);
        tempEarlyMap.get(p.month).push({ ...p });
    });
    
    let tempTrenchSchedule = [];
    for (let trench of trenches) {
        let amount = totalLoanAmount * trench.share;
        if (amount > 0) {
            tempTrenchSchedule.push({ month: trench.month, amount: amount });
        }
    }
    
    while (tempDebt > 0.01 && tempMonth <= maxMonths) {
        for (let trench of tempTrenchSchedule) {
            if (trench.month > 0 && trench.month === tempMonth - 1 && trench.amount > 0) {
                tempDebt += trench.amount;
                tempRemainingMonths = Math.max(1, monthsTotal - tempMonth + 1);
                tempMonthlyPayment = calculateMonthlyPayment(tempDebt, monthlyRate, tempRemainingMonths);
            }
        }
        
        let interestPay = tempDebt * monthlyRate;
        let principalPay = Math.min(tempMonthlyPayment - interestPay, tempDebt);
        if (principalPay < 0) principalPay = 0;
        tempDebt -= principalPay;
        
        let earlyTemp = tempEarlyMap.get(tempMonth) || [];
        for (let ep of earlyTemp) {
            let earlyAmt = Math.min(ep.amount, tempDebt);
            if (earlyAmt > 0) {
                tempDebt -= earlyAmt;
                if (ep.type === 'term' && tempDebt > 0) {
                    let fixedPay = tempMonthlyPayment;
                    if (monthlyRate > 0 && fixedPay > tempDebt * monthlyRate) {
                        let newM = Math.log(fixedPay / (fixedPay - tempDebt * monthlyRate)) / Math.log(1 + monthlyRate);
                        tempRemainingMonths = Math.max(1, Math.ceil(newM));
                        tempMonthlyPayment = fixedPay;
                    } else {
                        tempRemainingMonths = Math.max(1, Math.ceil(tempDebt / fixedPay));
                    }
                } else if (ep.type === 'payment' && tempDebt > 0) {
                    let remM = Math.max(1, tempRemainingMonths);
                    tempMonthlyPayment = calculateMonthlyPayment(tempDebt, monthlyRate, remM);
                }
            }
        }
        
        tempMonth++;
        if (tempDebt <= 0.01) break;
    }
    actualMonths = tempMonth - 1;
    
    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0]?.payment || 0);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPayment + downPayment);
    
    let yearsVal = Math.floor(actualMonths / 12);
    let monthsVal = actualMonths % 12;
    let termText = '';
    if (yearsVal > 0) termText += `${yearsVal} ${getYearWord(yearsVal)}`;
    if (monthsVal > 0) termText += ` ${monthsVal} ${getMonthWord(monthsVal)}`;
    if (termText === '') termText = '0 месяцев';
    document.getElementById('actualTerm').textContent = termText;
    
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

document.getElementById('basePrice').addEventListener('input', updatePrices);
document.getElementById('discountPercent').addEventListener('input', updatePrices);
document.getElementById('discountRub').addEventListener('input', updatePrices);

document.getElementById('basePrice').addEventListener('click', function() { this.select(); });
document.getElementById('discountPercent').addEventListener('click', function() { this.select(); });
document.getElementById('discountRub').addEventListener('click', function() { this.select(); });

document.getElementById('propertyPrice').addEventListener('input', () => {
    setMinDownPayment();
    validateAndFixDownPayment();
    updateInterestRateByDownPayment();
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('downPayment').addEventListener('input', () => {
    validateAndFixDownPayment();
    updateInterestRateByDownPayment();
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('downPayment').addEventListener('click', function() { this.select(); });

document.getElementById('downPayment').addEventListener('blur', function() {
    let propertyPrice = getCurrentPropertyPrice();
    let minDownPayment = propertyPrice * MIN_DOWN_PAYMENT_PERCENT / 100;
    let currentValue = parseFloat(this.value) || 0;
    
    if (currentValue < minDownPayment && propertyPrice > 0) {
        this.value = Math.round(minDownPayment);
        updateInterestRateByDownPayment();
        if (currentMortgageType === 'trench') {
            renderTrenchControls();
        }
        calculateMortgage();
        saveCurrentValues();
    }
});

document.getElementById('interestRate').addEventListener('input', () => {
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('termValue').addEventListener('input', () => {
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

document.getElementById('termUnit').addEventListener('change', () => {
    if (currentMortgageType === 'trench') {
        renderTrenchControls();
    }
    calculateMortgage();
    saveCurrentValues();
});

let radios = document.querySelectorAll('input[name="mortgageType"]');
radios.forEach(radio => radio.addEventListener('change', onMortgageTypeChange));

window.onload = function() {
    currentMortgageType = 'annuity';
    document.querySelector('input[value="annuity"]').checked = true;
    document.getElementById('trenchInfo').style.display = 'none';
    updatePrices(); 
    loadValuesForCurrentType();
    calculateMortgage();
};