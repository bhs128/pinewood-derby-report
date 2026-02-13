import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function SlopeChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null
    
    // Sort by average time
    const sorted = [...data].sort((a, b) => a.avgExceptSlowest - b.avgExceptSlowest)
    
    // Create labels (racer names)
    const labels = sorted.map(r => `${r.firstName} ${r.lastName}`)
    
    // Data points showing den race avg vs grand finals avg
    // For slope chart, we show the improvement/change
    
    return {
      labels,
      datasets: [
        {
          label: 'Average Time',
          data: sorted.map(r => r.avgExceptSlowest || r.avgTime),
          borderColor: 'rgba(0, 51, 102, 1)',
          backgroundColor: 'rgba(0, 51, 102, 0.8)',
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0,
          fill: false
        },
        {
          label: 'Best Time',
          data: sorted.map(r => r.bestTime),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          pointRadius: 4,
          pointStyle: 'triangle',
          tension: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Worst Time',
          data: sorted.map(r => r.worstTime),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          pointRadius: 4,
          pointStyle: 'cross',
          tension: 0,
          fill: false,
          borderDash: [2, 2]
        }
      ]
    }
  }, [data])

  if (!chartData) {
    return <div className="text-gray-400 text-center py-8">No finalist data available</div>
  }

  const options = {
    indexAxis: 'y',  // Horizontal chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.x.toFixed(4)}s`
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Finish Time (seconds)',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        title: {
          display: false
        },
        ticks: {
          font: { size: 10 }
        },
        grid: {
          display: false
        }
      }
    },
    animation: false  // Disable for PDF rendering
  }

  return <Line data={chartData} options={options} />
}

export default SlopeChart
