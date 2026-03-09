let earlyPayments = [];

function addEarlyPayment() {
    const newPayment = {
        month: 12,
        amount: 100000,
        type: 'term'
    };
    earlyPayments.push(newPayment);
    renderEarlyPayments();
    calculateMortgage();
}

function removeEarlyPayment(index) {
    earlyPayments.splice(index, 1);
    renderEarlyPayments();
    calculateMortgage();
}

function updateEarlyPayment(index, field, value) {
    if (field === 'amount') {
        earlyPayments[index][field] = parseFloat(value) || 0;
    } else if (field === 'month') {
        earlyPayments[index][field] = parseInt(value) || 1;
    } else {
        earlyPayments[index][field] = value;
    }
    calculateMortgage();
}

function renderEarlyPayments() {
    const container = document.getElementById('earlyPaymentsList');
    if (earlyPayments.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 16px;">Нет досрочных погашений</p>';
        return;
    }

    let html = '';
    earlyPayments.forEach((payment, index) => {
        html += `
            <div class="early-item">
                <input type="number" value="${payment.month}" min="1" step="1" 
                       onchange="updateEarlyPayment(${index}, 'month', this.value)"
                       placeholder="Месяц">
                <input type="number" value="${payment.amount}" min="0" step="10000"
                       onchange="updateEarlyPayment(${index}, 'amount', this.value)"
                       placeholder="Сумма">
                <select onchange="updateEarlyPayment(${index}, 'type', this.value)">
                    <option value="term" ${payment.type === 'term' ? 'selected' : ''}>Уменьшить срок</option>
                    <option value="payment" ${payment.type === 'payment' ? 'selected' : ''}>Уменьшить платёж</option>
                </select>
                <button class="remove-btn" onclick="removeEarlyPayment(${index})">Удалить</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU') + ' ₽';
}

function calculateMortgage() {
    let loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    let annualRate = parseFloat(document.getElementById('interestRate').value) || 0;
    let years = parseFloat(document.getElementById('loanTerm').value) || 1;

    if (loanAmount <= 0 || annualRate <= 0 || years < 1) {
        return;
    }

    let monthlyRate = annualRate / 100 / 12;
    let months = years * 12;
    let remainingDebt = loanAmount;
    
    let schedule = [];
    let totalInterest = 0;
    let totalPayment = 0;
    let currentMonth = 1;
    
    let sortedEarlyPayments = [...earlyPayments].sort((a, b) => a.month - b.month);
    let earlyPaymentsMap = new Map();
    sortedEarlyPayments.forEach(p => {
        if (!earlyPaymentsMap.has(p.month)) {
            earlyPaymentsMap.set(p.month, []);
        }
        earlyPaymentsMap.get(p.month).push({...p});
    });

    function calculateMonthlyPayment(debt, rate, remainingMonths) {
        if (rate === 0) return debt / remainingMonths;
        if (debt <= 0) return 0;
        return debt * rate * Math.pow(1 + rate, remainingMonths) / (Math.pow(1 + rate, remainingMonths) - 1);
    }

    while (remainingDebt > 0.01 && currentMonth <= months * 3) {
        let remainingMonths = Math.max(1, months - currentMonth + 1);
        let monthlyPayment = calculateMonthlyPayment(remainingDebt, monthlyRate, remainingMonths);
        
        let interestPayment = remainingDebt * monthlyRate;
        let principalPayment = Math.min(monthlyPayment - interestPayment, remainingDebt);
        
        if (principalPayment > remainingDebt - 0.01) {
            principalPayment = remainingDebt;
            monthlyPayment = interestPayment + principalPayment;
        }

        remainingDebt -= principalPayment;
        
        let scheduleEntry = {
            month: currentMonth,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remainingDebt: remainingDebt,
            earlyPayment: 0
        };

        let earlyPaymentsThisMonth = earlyPaymentsMap.get(currentMonth) || [];
        
        for (let earlyPayment of earlyPaymentsThisMonth) {
            let earlyAmount = Math.min(earlyPayment.amount, remainingDebt);
            
            if (earlyAmount > 0) {
                remainingDebt -= earlyAmount;
                scheduleEntry.earlyPayment += earlyAmount;
            }
        }

        scheduleEntry.remainingDebt = remainingDebt;
        
        totalInterest += interestPayment;
        totalPayment += monthlyPayment + scheduleEntry.earlyPayment;
        
        schedule.push(scheduleEntry);
        currentMonth++;
        
        if (currentMonth > 1200) break;
    }

    document.getElementById('monthlyPayment').textContent = formatMoney(schedule[0]?.payment || 0);
    document.getElementById('totalOverpayment').textContent = formatMoney(totalInterest);
    document.getElementById('totalPayment').textContent = formatMoney(totalPayment);
    
    let actualMonths = schedule.length;
    let actualYears = Math.floor(actualMonths / 12);
    let remainingMonths = actualMonths % 12;
    
    let termText = '';
    if (actualYears > 0) {
        termText += `${actualYears} ${getYearWord(actualYears)}`;
    }
    if (remainingMonths > 0) {
        termText += ` ${remainingMonths} ${getMonthWord(remainingMonths)}`;
    }
    document.getElementById('actualTerm').textContent = termText || '0 месяцев';

    renderSchedule(schedule);
}

function getYearWord(years) {
    if (years % 10 === 1 && years % 100 !== 11) return 'год';
    if ([2, 3, 4].includes(years % 10) && ![12, 13, 14].includes(years % 100)) return 'года';
    return 'лет';
}

function getMonthWord(months) {
    if (months % 10 === 1 && months % 100 !== 11) return 'месяц';
    if ([2, 3, 4].includes(months % 10) && ![12, 13, 14].includes(months % 100)) return 'месяца';
    return 'месяцев';
}

function renderSchedule(schedule) {
    const tbody = document.getElementById('scheduleBody');
    
    if (schedule.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">Введите параметры для расчета</td></tr>';
        return;
    }

    let html = '';
    schedule.forEach(month => {
        const rowClass = month.earlyPayment > 0 ? 'early-payment-row' : '';
        html += `
            <tr class="${rowClass}">
                <td>${month.month}</td>
                <td class="text-right">${formatMoney(month.payment)}</td>
                <td class="text-right">${formatMoney(month.principal)}</td>
                <td class="text-right">${formatMoney(month.interest)}</td>
                <td class="text-right">${formatMoney(month.remainingDebt)}</td>
                <td class="text-right">${month.earlyPayment > 0 ? formatMoney(month.earlyPayment) : '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

document.getElementById('loanAmount').addEventListener('input', calculateMortgage);
document.getElementById('interestRate').addEventListener('input', calculateMortgage);
document.getElementById('loanTerm').addEventListener('input', calculateMortgage);

window.onload = function() {
    earlyPayments.push({
        month: 12,
        amount: 200000,
        type: 'term'
    });
    earlyPayments.push({
        month: 24,
        amount: 300000,
        type: 'payment'
    });
    renderEarlyPayments();
    calculateMortgage();
};