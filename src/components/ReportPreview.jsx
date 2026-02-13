import { useRef, useCallback, useState, useMemo } from 'react'
import ResultsTable from './ResultsTable'
import HistogramChart from './charts/HistogramChart'
import SlopeChart from './charts/SlopeChart'
import { generatePDF } from '../utils/pdfGenerator'

function ReportPreview({ raceData, settings, onBack }) {
  const reportRef = useRef(null)
  const [generating, setGenerating] = useState(false)

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return
    
    setGenerating(true)
    try {
      await generatePDF(reportRef.current, `${settings.title}_${settings.year}_Results.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }, [settings])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Get the sort key based on avgMethod setting
  const avgKey = settings.avgMethod === 'allHeats' ? 'avgTime' : 'avgExceptSlowest'

  // Use class config if provided, otherwise fall back to raceData.classes
  const orderedClasses = useMemo(() => {
    const classList = settings.classConfig
      ? settings.classConfig
          .filter(c => c.included)
          .sort((a, b) => a.order - b.order)
          .map(cfg => ({
            ...cfg,
            // Use key (lowercase name) for resultsByClass lookup
            results: [...(raceData.resultsByClass[cfg.key] || [])]
              .sort((a, b) => (a[avgKey] || 0) - (b[avgKey] || 0))
          }))
      : raceData.classes
          .filter(c => !c.name.toLowerCase().includes('sibling'))
          .map(cls => ({
            key: cls.name.toLowerCase(),
            name: cls.name,
            results: [...(raceData.resultsByClass[cls.name.toLowerCase()] || [])]
              .sort((a, b) => (a[avgKey] || 0) - (b[avgKey] || 0))
          }))
    return classList
  }, [raceData, settings.classConfig, avgKey])

  // Separate grand finals from den classes using user-selected grandFinalsKey
  const grandFinalsKey = settings.grandFinalsKey
  
  const denClasses = orderedClasses.filter(c => c.key !== grandFinalsKey)
  const grandFinalsClass = orderedClasses.find(c => c.key === grandFinalsKey)

  // Use the selected grand finals class results
  const grandFinalsData = useMemo(() => {
    if (!grandFinalsClass) return []
    return [...grandFinalsClass.results].sort((a, b) => (a[avgKey] || 0) - (b[avgKey] || 0))
  }, [grandFinalsClass, avgKey])

  // Count unique racers from included classes (excluding grand finals to avoid double-counting)
  const uniqueRacerCount = useMemo(() => {
    const racerIds = new Set()
    denClasses.forEach(cls => {
      cls.results.forEach(racer => {
        racerIds.add(racer.racerId)
      })
    })
    return racerIds.size
  }, [denClasses])

  // Build map of racer key (name+car) -> den results for slope chart
  // Use firstName|lastName|carNumber as key since racerId (KidCarYear) includes class name
  const denResultsByRacer = useMemo(() => {
    const map = {}
    denClasses.forEach(cls => {
      cls.results.forEach(racer => {
        // Create a key without class name for matching across den and grand finals
        const key = `${racer.firstName}|${racer.lastName}|${racer.carNumber}`
        // Only keep first den result per racer (in case of duplicates)
        if (!map[key]) {
          map[key] = racer
        }
      })
    })
    return map
  }, [denClasses])

  // Calculate the grand finals winners (top N) that should be excluded from den rankings
  // Uses racer key (name+car) instead of racerId since racerId includes class name
  const excludedGrandFinalsWinners = useMemo(() => {
    if (!settings.excludeGrandFinalsWinners || grandFinalsData.length === 0) {
      return []
    }
    const numWinners = settings.numGrandFinalsWinners || 3
    // Top N racers in grand finals - create keys without class name for matching
    return grandFinalsData.slice(0, numWinners).map(r => 
      `${r.firstName}|${r.lastName}|${r.carNumber}`
    )
  }, [grandFinalsData, settings.excludeGrandFinalsWinners, settings.numGrandFinalsWinners])

  // Helper to render a layout item
  const renderLayoutItem = useCallback((item) => {
    if (item.type === 'den') {
      const cls = orderedClasses.find(c => c.key === item.key)
      if (!cls || cls.results.length === 0) return null
      return (
        <ResultsTable
          key={item.id}
          className={cls.name}
          results={cls.results}
          finalists={raceData.finalists}
          wildcards={raceData.wildcards}
          avgKey={avgKey}
          excludedGrandFinalsWinners={excludedGrandFinalsWinners}
        />
      )
    }
    
    if (item.type === 'grand-finals') {
      if (grandFinalsData.length === 0) return null
      return (
        <ResultsTable
          key={item.id}
          className={grandFinalsClass?.name || "Grand Finals"}
          results={grandFinalsData}
          finalists={[]}
          wildcards={[]}
          showDenOrigin={true}
          avgKey={avgKey}
        />
      )
    }
    
    if (item.type === 'slope-chart') {
      if (grandFinalsData.length === 0) return null
      return (
        <div key={item.id}>
          <h3 className="text-center font-heading border-b border-black pb-1 mb-3">
            Slope Chart: Den Avg vs Grand Finals Avg
          </h3>
          <div className="chart-container" style={{ height: '350px' }}>
            <SlopeChart 
              grandFinalsData={grandFinalsData} 
              denResultsByRacer={denResultsByRacer}
              avgKey={avgKey}
            />
          </div>
        </div>
      )
    }
    
    return null
  }, [orderedClasses, grandFinalsData, grandFinalsClass, raceData, avgKey, excludedGrandFinalsWinners, denResultsByRacer])

  // Use the layout from settings, or fall back to legacy layout
  const reportLayout = settings.reportLayout

  return (
    <div>
      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between no-print">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 transition-colors"
        >
          ← Back to Settings
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded font-medium border border-derby-blue text-derby-blue hover:bg-blue-50 transition-colors"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={generating}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              generating
                ? 'bg-gray-400 cursor-wait'
                : 'bg-derby-blue text-white hover:bg-blue-700'
            }`}
          >
            {generating ? '⏳ Generating...' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="overflow-x-auto">
        <div ref={reportRef} className="report-preview mx-auto bg-white">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-display font-bold text-gray-900">
              {settings.title} - {settings.year} Results
            </h1>
            {settings.date && (
              <p className="text-lg font-heading text-gray-600 mt-1">{settings.date}</p>
            )}
            <p className="text-lg font-heading text-gray-600">{uniqueRacerCount} Racers</p>
          </div>

          {/* Two Column Layout - Using user-configured layout */}
          {reportLayout ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
                {reportLayout.leftColumn.map(item => renderLayoutItem(item))}
              </div>
              
              {/* Right Column */}
              <div className="space-y-4">
                {reportLayout.rightColumn.map(item => renderLayoutItem(item))}
              </div>
            </div>
          ) : (
            /* Fallback: Legacy layout */
            <>
              {/* Den Results - Two Column Layout */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {denClasses.filter((_, i) => i % 2 === 0).map(cls => (
                    <ResultsTable
                      key={cls.key}
                      className={cls.name}
                      results={cls.results}
                      finalists={raceData.finalists}
                      wildcards={raceData.wildcards}
                      avgKey={avgKey}
                      excludedGrandFinalsWinners={excludedGrandFinalsWinners}
                    />
                  ))}
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  {denClasses.filter((_, i) => i % 2 === 1).map(cls => (
                    <ResultsTable
                      key={cls.key}
                      className={cls.name}
                      results={cls.results}
                      finalists={raceData.finalists}
                      wildcards={raceData.wildcards}
                      avgKey={avgKey}
                      excludedGrandFinalsWinners={excludedGrandFinalsWinners}
                    />
                  ))}
                </div>
              </div>

              {/* Grand Finals - Single Column */}
              {grandFinalsData.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <ResultsTable
                      className={grandFinalsClass?.name || "Grand Finals"}
                      results={grandFinalsData}
                      finalists={[]}
                      wildcards={[]}
                      showDenOrigin={true}
                      avgKey={avgKey}
                    />
                  </div>
                  <div></div>
                </div>
              )}

              {/* Slope Chart - Single Column, after Grand Finals */}
              {grandFinalsData.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-center font-heading border-b border-black pb-1 mb-3">
                      Slope Chart: Den Avg vs Grand Finals Avg
                    </h3>
                    <div className="chart-container" style={{ height: '350px' }}>
                      <SlopeChart 
                        grandFinalsData={grandFinalsData} 
                        denResultsByRacer={denResultsByRacer}
                        avgKey={avgKey}
                      />
                    </div>
                  </div>
                  <div></div>
                </div>
              )}
            </>
          )}

          {/* Design Awards */}
          {settings.designAwards && settings.designAwards.some(a => a.winner) && (
            <div className="mb-6">
              <h2 className="text-center font-medium text-gray-700 mb-2">Car Design Winners</h2>
              <table className="results-table mx-auto">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Scout (Car Number)</th>
                    <th>Car Name</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.designAwards.filter(a => a.winner).map((award, i) => (
                    <tr key={i}>
                      <td>{award.category}</td>
                      <td>{award.winner}</td>
                      <td className="text-right italic">{award.carName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Histogram - Full Width */}
          <div className="mb-6">
            <h3 className="text-center font-heading border-b border-black pb-1 mb-3">
              Histogram of All Finish Times
            </h3>
            <div className="chart-container" style={{ height: '250px' }}>
              <HistogramChart 
                data={raceData.allTimes} 
                classes={raceData.classes}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportPreview
