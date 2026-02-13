import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Spectral-inspired color palette (similar to R's Spectral)
const CLASS_COLORS = {
  'lions': 'rgba(213, 62, 79, 0.8)',
  'lion': 'rgba(213, 62, 79, 0.8)',
  'tigers': 'rgba(252, 141, 89, 0.8)',
  'tiger': 'rgba(252, 141, 89, 0.8)',
  'wolves': 'rgba(254, 224, 139, 0.8)',
  'wolf': 'rgba(254, 224, 139, 0.8)',
  'bears': 'rgba(230, 245, 152, 0.8)',
  'bear': 'rgba(230, 245, 152, 0.8)',
  'webelos': 'rgba(153, 213, 148, 0.8)',
  'arrow of light': 'rgba(50, 136, 189, 0.8)',
  'aol': 'rgba(50, 136, 189, 0.8)',
  'grand finals': 'rgba(94, 79, 162, 0.8)',
  'grand final': 'rgba(94, 79, 162, 0.8)',
  'default': 'rgba(128, 128, 128, 0.8)'
}

function getClassColor(className) {
  const key = className.toLowerCase()
  for (const [pattern, color] of Object.entries(CLASS_COLORS)) {
    if (key.includes(pattern)) return color
  }
  return CLASS_COLORS.default
}

function HistogramChart({ data, classes, binWidth = 0.02 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null
    
    // Determine range
    const times = data.map(d => d.time).filter(t => t > 0)
    const minTime = Math.floor(Math.min(...times) * 50) / 50  // Round down to nearest 0.02
    const maxTime = Math.ceil(Math.max(...times) * 50) / 50   // Round up to nearest 0.02
    
    // Create bins
    const bins = []
    for (let t = minTime; t < maxTime; t += binWidth) {
      bins.push({
        start: t,
        end: t + binWidth,
        label: t.toFixed(2),
        counts: {}
      })
    }
    
    // Count occurrences per bin per class
    data.forEach(d => {
      const binIndex = Math.floor((d.time - minTime) / binWidth)
      if (binIndex >= 0 && binIndex < bins.length) {
        const className = d.className || 'Unknown'
        bins[binIndex].counts[className] = (bins[binIndex].counts[className] || 0) + 1
      }
    })
    
    // Get unique class names
    const classNames = [...new Set(data.map(d => d.className))].filter(Boolean)
    
    // Create datasets for stacked bar chart
    const datasets = classNames.map(className => ({
      label: className,
      data: bins.map(bin => bin.counts[className] || 0),
      backgroundColor: getClassColor(className),
      borderColor: getClassColor(className).replace('0.8', '1'),
      borderWidth: 1
    }))
    
    // Calculate median for vertical line
    const sortedTimes = [...times].sort((a, b) => a - b)
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
    
    return {
      labels: bins.map(b => b.label),
      datasets,
      median
    }
  }, [data, binWidth])

  if (!chartData) {
    return <div className="text-gray-400 text-center py-8">No data available</div>
  }

  const options = {
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
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Finish Time (seconds)',
          font: { size: 11 }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 9 }
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Count',
          font: { size: 11 }
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 10 }
        }
      }
    },
    animation: false  // Disable for PDF rendering
  }

  return <Bar data={chartData} options={options} />
}

export default HistogramChart
