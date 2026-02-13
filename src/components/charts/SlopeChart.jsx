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

// Color palette for racers
const RACER_COLORS = [
  'rgba(213, 62, 79, 1)',
  'rgba(252, 141, 89, 1)',
  'rgba(254, 224, 139, 1)',
  'rgba(230, 245, 152, 1)',
  'rgba(153, 213, 148, 1)',
  'rgba(50, 136, 189, 1)',
  'rgba(94, 79, 162, 1)',
  'rgba(171, 221, 164, 1)',
  'rgba(102, 194, 165, 1)',
  'rgba(158, 154, 200, 1)',
  'rgba(188, 189, 220, 1)',
  'rgba(228, 196, 159, 1)'
]

function SlopeChart({ grandFinalsData, denResultsByRacer, avgKey = 'avgExceptSlowest' }) {
  const chartData = useMemo(() => {
    if (!grandFinalsData || grandFinalsData.length === 0) return null
    
    // Two categories on x-axis: Den Avg and Grand Finals Avg
    const labels = ['Den Avg', 'Grand Finals Avg']
    
    // Sort racers by grand finals performance
    const sorted = [...grandFinalsData].sort((a, b) => 
      (a[avgKey] || a.avgExceptSlowest || 0) - (b[avgKey] || b.avgExceptSlowest || 0)
    )
    
    // Create a dataset (line) for each racer
    const datasets = sorted.map((racer, index) => {
      const grandFinalsAvg = racer[avgKey] || racer.avgExceptSlowest || racer.avgTime
      
      // Look up den result using name+carNumber key (since KidCarYear includes class name)
      const racerKey = `${racer.firstName}|${racer.lastName}|${racer.carNumber}`
      const denResult = denResultsByRacer?.[racerKey]
      const denAvg = denResult?.[avgKey] || 
                     denResult?.avgExceptSlowest ||
                     grandFinalsAvg // Fallback to GF avg if no den data
      
      return {
        label: `${racer.firstName} ${racer.lastName}`,
        data: [denAvg, grandFinalsAvg],
        borderColor: RACER_COLORS[index % RACER_COLORS.length],
        backgroundColor: RACER_COLORS[index % RACER_COLORS.length],
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0,
        fill: false,
        borderWidth: 2
      }
    })
    
    return { labels, datasets }
  }, [grandFinalsData, denResultsByRacer, avgKey])

  if (!chartData) {
    return <div className="text-gray-400 text-center py-8">No finalist data available</div>
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 10
      }
    },
    plugins: {
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          boxWidth: 10,
          padding: 8,
          font: { size: 9 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}s`
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: false
        },
        ticks: {
          font: { size: 11, weight: 'bold' }
        },
        grid: {
          display: false
        }
      },
      y: {
        reverse: true,
        title: {
          display: true,
          text: 'Avg Time (seconds) - Lower is Better',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    animation: false  // Disable for PDF rendering
  }

  return <Line data={chartData} options={options} />
}

export default SlopeChart
