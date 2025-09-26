/**
 * Chart utilities for enhanced test result visualization
 * Provides interactive charts and data visualization for test reports
 */

/**
 * Initialize enhanced charts with interactivity
 */
function initializeEnhancedCharts(chartData, rawResults, statsData) {
    // Initialize Chart.js with global defaults
    Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 20;
    
    // Status distribution chart
    initializeStatusChart(chartData.statusDistribution);
    
    // Performance chart
    initializePerformanceChart(chartData.performanceTimeline);
    
    // Category breakdown chart
    initializeCategoryChart(chartData.categoryBreakdown);
    
    // Node type performance chart
    initializeNodeTypeChart(chartData.nodeTypePerformance);
    
    // Duration distribution chart
    initializeDurationChart(chartData.durationDistribution);
    
    // Error frequency chart
    initializeErrorChart(chartData.errorFrequency);
    
    // Timeline chart
    initializeTimelineChart(chartData.performanceTimeline);
}

/**
 * Initialize status distribution chart
 */
function initializeStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    window.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label}: ${data.datasets[0].data[i]}`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                strokeStyle: data.datasets[0].backgroundColor[i],
                                lineWidth: 0,
                                pointStyle: 'circle'
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
}

/**
 * Initialize performance metrics chart
 */
function initializePerformanceChart(data) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx || !data.datasets || data.datasets.length === 0) return;
    
    window.performanceChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Duration (ms)'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Initialize category breakdown chart
 */
function initializeCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx || !data.datasets) return;
    
    window.categoryChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        }
    });
}

/**
 * Initialize node type performance chart
 */
function initializeNodeTypeChart(data) {
    const ctx = document.getElementById('nodeTypeChart');
    if (!ctx || !data.datasets) return;
    
    window.nodeTypeChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Duration (ms)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Success Rate (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.yAxisID === 'y1') {
                                label += context.parsed.y.toFixed(1) + '%';
                            } else {
                                label += context.parsed.y.toFixed(2) + 'ms';
                            }
                            return label;
                        }
                    }
                }
            },
            animation: {
                duration: 1000
            }
        }
    });
}

/**
 * Initialize duration distribution chart
 */
function initializeDurationChart(data) {
    const ctx = document.getElementById('durationChart');
    if (!ctx || !data.datasets) return;
    
    window.durationChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Test Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Duration Range'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutBounce'
            }
        }
    });
}

/**
 * Initialize error frequency chart
 */
function initializeErrorChart(data) {
    const ctx = document.getElementById('errorChart');
    if (!ctx || !data.datasets || data.datasets[0].data.length === 0) {
        // Show "No errors" message
        ctx.parentElement.innerHTML = '<div class="no-data">No errors found! 🎉</div>';
        return;
    }
    
    window.errorChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1200
            }
        }
    });
}

/**
 * Initialize timeline chart
 */
function initializeTimelineChart(data) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx || !data.datasets) return;
    
    window.timelineChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Duration (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Setup chart interactivity
 */
function setupChartInteractivity() {
    // Chart type toggles
    document.querySelectorAll('.chart-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            const chartContainer = this.closest('.chart-item');
            const canvas = chartContainer.querySelector('canvas');
            
            // Update active state
            chartContainer.querySelectorAll('.chart-toggle').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart type
            if (window.statusChart && canvas.id === 'statusChart') {
                window.statusChart.config.type = chartType;
                if (chartType === 'bar') {
                    window.statusChart.options.cutout = 0;
                } else {
                    window.statusChart.options.cutout = '60%';
                }
                window.statusChart.update();
            }
        });
    });
    
    // Expand buttons
    document.querySelectorAll('.expand-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetChart = this.dataset.target;
            const modal = document.getElementById('chartModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalChart = document.getElementById('modalChart');
            
            // Set modal title
            modalTitle.textContent = this.closest('.chart-item').querySelector('h3').textContent;
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Clone chart to modal (simplified version)
            setTimeout(() => {
                const originalChart = window[targetChart.replace('Chart', '') + 'Chart'];
                if (originalChart) {
                    new Chart(modalChart, {
                        type: originalChart.config.type,
                        data: originalChart.data,
                        options: {
                            ...originalChart.options,
                            maintainAspectRatio: true
                        }
                    });
                }
            }, 100);
        });
    });
    
    // Modal close
    document.querySelector('.modal-close')?.addEventListener('click', function() {
        document.getElementById('chartModal').classList.add('hidden');
    });
    
    // Bucket slider for duration distribution
    const bucketSlider = document.getElementById('bucketSlider');
    const bucketCount = document.getElementById('bucketCount');
    
    if (bucketSlider && bucketCount) {
        bucketSlider.addEventListener('input', function() {
            bucketCount.textContent = this.value;
            // Regenerate duration chart with new bucket count
            // This would require access to raw data to recalculate
        });
    }
    
    // Timeline zoom controls
    document.querySelectorAll('.timeline-zoom').forEach(button => {
        button.addEventListener('click', function() {
            const zoom = this.dataset.zoom;
            
            // Update active state
            document.querySelectorAll('.timeline-zoom').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter timeline data based on zoom level
            // This would require access to raw data to filter
        });
    });
    
    // Error details toggle
    document.querySelectorAll('.details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const target = document.getElementById(this.dataset.target);
            if (target) {
                target.classList.toggle('hidden');
                this.textContent = target.classList.contains('hidden') ? 'View Details' : 'Hide Details';
            }
        });
    });
}

/**
 * Setup filters for charts
 */
function setupFilters() {
    const timeFilter = document.getElementById('timeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const exportBtn = document.getElementById('exportCharts');
    
    // Time filter
    if (timeFilter) {
        timeFilter.addEventListener('change', function() {
            const filterValue = this.value;
            // Filter all charts based on time range
            // This would require access to raw data to filter and regenerate charts
            console.log('Time filter changed to:', filterValue);
        });
    }
    
    // Category filter
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            const filterValue = this.value;
            // Filter charts based on category
            console.log('Category filter changed to:', filterValue);
        });
    }
    
    // Export charts
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportAllCharts();
        });
    }
}

/**
 * Export all charts as images
 */
function exportAllCharts() {
    const charts = ['statusChart', 'performanceChart', 'categoryChart', 'nodeTypeChart', 'durationChart', 'errorChart', 'timelineChart'];
    
    charts.forEach(chartId => {
        const chart = window[chartId.replace('Chart', '') + 'Chart'];
        if (chart) {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.download = `${chartId}.png`;
            link.href = url;
            link.click();
        }
    });
}

/**
 * Utility function to format numbers
 */
function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
}

/**
 * Utility function to format duration
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms.toFixed(1)}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`;
    } else {
        return `${(ms / 60000).toFixed(2)}m`;
    }
}

// Export functions for use in HTML reports
if (typeof module !== 'undefined' && module.exports) {
// Node.js compatibility check
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment - no exports needed for browser
}

// Global exports for browser
if (typeof window !== 'undefined') {
    window.initializeEnhancedCharts = initializeEnhancedCharts;
    window.setupChartInteractivity = setupChartInteractivity;
    window.setupFilters = setupFilters;
    window.exportAllCharts = exportAllCharts;
    window.formatNumber = formatNumber;
    window.formatDuration = formatDuration;
}