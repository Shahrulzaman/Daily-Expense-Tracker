/**
 * Daily Expense Tracker — Main Application Logic
 * Uses jQuery for DOM manipulation, events, and animations.
 * Data persisted via localStorage.
 */

$(document).ready(function () {
    // =========================================
    // DATA LAYER — localStorage persistence
    // =========================================
    const STORAGE_KEY = 'expense_tracker_data';

    function loadExpenses() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveExpenses(expenses) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }

    let expenses = loadExpenses();

    // =========================================
    // UTILITY HELPERS
    // =========================================
    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function formatCurrency(amount) {
        return 'RM' + parseFloat(amount).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getUniqueYears() {
        const currentYear = new Date().getFullYear();
        const yearSet = new Set();
        // Always show years from 2020 to current year
        for (let y = currentYear; y >= 2023; y--) {
            yearSet.add(y);
        }
        // Also add any year that has expense data
        expenses.forEach(function (e) {
            yearSet.add(new Date(e.date).getFullYear());
        });
        // Convert to array and sort descending
        const years = [...yearSet].sort((a, b) => b - a);
        return years;
    }

    // =========================================
    // YEAR FILTER
    // =========================================
    function populateYearFilter() {
        const $yearFilter = $('#yearFilter');
        const currentVal = $yearFilter.val();
        const years = getUniqueYears();

        $yearFilter.empty();
        years.forEach(function (year) {
            $yearFilter.append($('<option>').val(year).text(year));
        });

        // Restore selection or default to first
        if (currentVal && years.includes(parseInt(currentVal))) {
            $yearFilter.val(currentVal);
        }
    }

    function getSelectedYear() {
        return parseInt($('#yearFilter').val());
    }

    // =========================================
    // BAR CHART RENDERING
    // =========================================
    function renderChart(selectedYear) {
        const monthlyTotals = new Array(12).fill(0);

        expenses.forEach(function (exp) {
            const d = new Date(exp.date);
            if (d.getFullYear() === selectedYear) {
                monthlyTotals[d.getMonth()] += parseFloat(exp.amount);
            }
        });

        const maxVal = Math.max(...monthlyTotals, 1); // avoid division by zero

        $('#chartBars .chart-bar-wrapper').each(function () {
            const month = parseInt($(this).data('month'));
            const total = monthlyTotals[month];
            const pct = (total / maxVal) * 100;
            const $bar = $(this).find('.chart-bar');

            // Remove old tooltip
            $(this).find('.chart-tooltip').remove();

            if (total > 0) {
                $bar.addClass('active');
                // Add tooltip
                $(this).append(
                    $('<span class="chart-tooltip">').text(formatCurrency(total))
                );
            } else {
                $bar.removeClass('active');
            }

            // Animate bar height with jQuery
            $bar.stop(true).animate({ height: Math.max(pct, 3) + '%' }, {
                duration: 600,
                easing: 'swing'
            });
        });
    }

    // =========================================
    // EXPENSE LIST RENDERING
    // =========================================
    function renderExpenseList(selectedYear) {
        const $list = $('#expenseList');
        const $noMsg = $('#noExpensesMsg');
        const $yearTotal = $('#yearTotal');

        const filtered = expenses.filter(function (exp) {
            return new Date(exp.date).getFullYear() === selectedYear;
        });

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        $list.empty();

        if (filtered.length === 0) {
            $noMsg.stop(true).fadeIn(300);
            $yearTotal.hide();
        } else {
            $noMsg.stop(true).fadeOut(200);

            // Year total
            const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            $yearTotal.text('Total: ' + formatCurrency(total)).fadeIn(300);

            filtered.forEach(function (exp, index) {
                const d = new Date(exp.date);
                const monthStr = MONTHS_SHORT[d.getMonth()];
                const dayStr = d.getDate();
                const yearStr = d.getFullYear();

                const $item = $(`
                    <div class="expense-item" style="animation-delay: ${index * 0.05}s">
                        <div class="expense-date-badge">
                            <div class="month">${monthStr}</div>
                            <div class="year-small">${yearStr}</div>
                            <div class="day">${dayStr}</div>
                        </div>
                        <div class="expense-info">
                            <div class="expense-name">${escapeHtml(exp.title)}</div>
                        </div>
                        <span class="expense-amount-badge">${formatCurrency(exp.amount)}</span>
                        <button class="expense-delete-btn" data-id="${exp.id}" title="Delete expense">
                            ✕
                        </button>
                    </div>
                `);

                $list.append($item);
            });
        }
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // =========================================
    // SUMMARY CARDS (Dashboard stats)
    // =========================================
    function renderSummaryCards(selectedYear) {
        const filtered = expenses.filter(function (exp) {
            return new Date(exp.date).getFullYear() === selectedYear;
        });

        const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const count = filtered.length;
        const avg = count > 0 ? total / 12 : 0;
        const highest = count > 0 ? Math.max(...filtered.map(e => parseFloat(e.amount))) : 0;

        $('#summaryTotal').text(formatCurrency(total));
        $('#summaryAvg').text(formatCurrency(avg));
        $('#summaryCount').text(count);
        $('#summaryHighest').text(formatCurrency(highest));
    }

    // =========================================
    // MASTER RENDER
    // =========================================
    function renderAll() {
        populateYearFilter();
        const year = getSelectedYear();
        renderSummaryCards(year);
        renderChart(year);
        renderExpenseList(year);
    }

    // =========================================
    // FORM TOGGLE — jQuery slide animation
    // =========================================
    $('#btnToggleForm').on('click', function () {
        const $card = $('#expenseFormCard');
        if ($card.is(':visible')) {
            $card.slideUp(350, function () {
                $('#btnToggleText').text('Add New Expense');
                resetForm();
            });
        } else {
            $card.slideDown(350);
            $('#btnToggleText').text('Hide Form');
            // Set default date to today
            $('#expenseDate').val(new Date().toISOString().split('T')[0]);
        }
    });

    $('#btnCancel').on('click', function () {
        $('#expenseFormCard').slideUp(350, function () {
            $('#btnToggleText').text('Add New Expense');
            resetForm();
        });
    });

    function resetForm() {
        $('#expenseForm')[0].reset();
        $('#expenseForm').removeClass('was-validated');
        $('.custom-input').removeClass('is-invalid');
    }

    // =========================================
    // FORM SUBMISSION — Add Expense
    // =========================================
    $('#expenseForm').on('submit', function (e) {
        e.preventDefault();

        const title = $.trim($('#expenseTitle').val());
        const amount = $.trim($('#expenseAmount').val());
        const date = $.trim($('#expenseDate').val());

        // Validation
        let valid = true;

        if (!title) {
            $('#expenseTitle').addClass('is-invalid');
            valid = false;
        } else {
            $('#expenseTitle').removeClass('is-invalid');
        }

        if (!amount || parseFloat(amount) <= 0) {
            $('#expenseAmount').addClass('is-invalid');
            valid = false;
        } else {
            $('#expenseAmount').removeClass('is-invalid');
        }

        if (!date) {
            $('#expenseDate').addClass('is-invalid');
            valid = false;
        } else {
            $('#expenseDate').removeClass('is-invalid');
        }

        if (!valid) return;

        // Create expense
        const expense = {
            id: generateId(),
            title: title,
            amount: parseFloat(amount),
            date: date
        };

        expenses.push(expense);
        saveExpenses(expenses);

        // Set year filter to newly added expense's year
        const newYear = new Date(date).getFullYear();
        populateYearFilter();
        $('#yearFilter').val(newYear);

        renderAll();

        // Hide form with animation
        $('#expenseFormCard').slideUp(350, function () {
            $('#btnToggleText').text('Add New Expense');
            resetForm();
        });

        // Brief highlight on the new list item
        setTimeout(function () {
            $('#expenseList .expense-item').first().css('border-color', 'rgba(37, 99, 235, 0.6)');
            setTimeout(function () {
                $('#expenseList .expense-item').first().css('border-color', '');
            }, 1200);
        }, 100);
    });

    // Clear validation styling on input
    $('.custom-input').on('input change', function () {
        $(this).removeClass('is-invalid');
    });

    // =========================================
    // DELETE EXPENSE (Creative bonus feature)
    // =========================================
    $('#expenseList').on('click', '.expense-delete-btn', function () {
        const id = $(this).data('id');
        const $item = $(this).closest('.expense-item');

        // Fade out animation
        $item.animate({ opacity: 0, marginLeft: '-30px' }, 300, function () {
            expenses = expenses.filter(function (e) { return e.id !== id; });
            saveExpenses(expenses);
            renderAll();
        });
    });

    // =========================================
    // YEAR FILTER CHANGE
    // =========================================
    $('#yearFilter').on('change', function () {
        const year = getSelectedYear();
        renderSummaryCards(year);
        renderChart(year);
        renderExpenseList(year);
    });

    // =========================================
    // SEED SAMPLE DATA (if first time)
    // =========================================
    function seedSampleData() {
        if (expenses.length === 0) {
            const sampleExpenses = [
                // 2024
                { id: generateId(), title: 'New TV', amount: 799.49, date: '2024-03-12' },
                { id: generateId(), title: 'Car Insurance', amount: 294.67, date: '2024-03-28' },
                { id: generateId(), title: 'New Desk (Wooden)', amount: 450.00, date: '2024-06-12' },
                { id: generateId(), title: 'Gym Membership', amount: 49.99, date: '2024-09-01' },
                // 2025
                { id: generateId(), title: 'Grocery Shopping', amount: 125.30, date: '2025-01-15' },
                { id: generateId(), title: 'Phone Bill', amount: 85.00, date: '2025-02-05' },
                { id: generateId(), title: 'Coffee Machine', amount: 199.00, date: '2025-07-20' },
                { id: generateId(), title: 'Movie Tickets', amount: 32.50, date: '2025-08-11' },
                { id: generateId(), title: 'Internet Bill', amount: 65.00, date: '2025-11-03' },
                // 2026
                { id: generateId(), title: 'Laptop Stand', amount: 89.99, date: '2026-01-10' },
                { id: generateId(), title: 'Electricity Bill', amount: 112.50, date: '2026-02-18' },
                { id: generateId(), title: 'Book Purchase', amount: 45.00, date: '2026-03-05' },
            ];
            expenses = sampleExpenses;
            saveExpenses(expenses);
        }
    }

    // =========================================
    // INITIALIZATION
    // =========================================
    seedSampleData();
    renderAll();
});
