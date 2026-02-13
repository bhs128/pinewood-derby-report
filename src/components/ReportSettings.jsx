import { useState, useCallback, useMemo, useRef } from 'react'

const DEFAULT_DESIGN_CATEGORIES = [
  'Most Likely to Win',
  'Most Humorous',
  'Most Patriotic',
  'Most Creative',
  'Best Use of Color',
  'Best Use of Decals'
]

// Standard den order for Cub Scouts
const STANDARD_DEN_ORDER = [
  'lion', 'lions', 'lion den',
  'tiger', 'tigers', 'tiger den',
  'wolf', 'wolves', 'wolf den',
  'bear', 'bears', 'bear den',
  'webelos', 'webelos den',
  'arrow of light', 'aol',
  'grand final', 'grand finals'
]

// Height per racer in pixels for layout preview (scaled down)
const HEIGHT_PER_RACER = 8
const MIN_ITEM_HEIGHT = 24
const CHART_HEIGHT = 60

function getDenSortOrder(name) {
  const lower = name.toLowerCase()
  for (let i = 0; i < STANDARD_DEN_ORDER.length; i++) {
    if (lower.includes(STANDARD_DEN_ORDER[i])) {
      return i
    }
  }
  return 999
}

function ReportSettings({ raceData, settings, onComplete, onBack }) {
  // Debug: log available keys
  console.log('Available resultsByClass keys:', Object.keys(raceData.resultsByClass))
  console.log('Available classes:', raceData.classes.map(c => c.name))
  
  // Initialize class config with sorted order - use useMemo to avoid recreating on every render
  // All classes that reach this stage were already filtered in the mapping step
  const initialClassConfig = useMemo(() => {
    if (settings.classConfig) return settings.classConfig
    
    return [...raceData.classes]
      .sort((a, b) => getDenSortOrder(a.name) - getDenSortOrder(b.name))
      .map((cls, i) => ({
        key: cls.name.toLowerCase(), // Use lowercase name as stable key
        name: cls.name,
        included: true, // All classes are included (filtering done in mapping step)
        order: i
      }))
  }, [raceData.classes, settings.classConfig])
  
  // Auto-detect grand finals based on name
  const initialGrandFinalsKey = useMemo(() => {
    if (settings.grandFinalsKey) return settings.grandFinalsKey
    const gf = initialClassConfig.find(c => 
      c.name.toLowerCase().includes('grand final') || 
      c.name.toLowerCase().includes('grand prix final')
    )
    return gf ? gf.key : null
  }, [initialClassConfig, settings.grandFinalsKey])
  
  const [formData, setFormData] = useState({
    title: settings.title || 'Pack Pinewood Derby',
    year: settings.year || new Date().getFullYear(),
    date: settings.date || '',
    location: settings.location || '',
    designAwards: settings.designAwards || DEFAULT_DESIGN_CATEGORIES.map(cat => ({
      category: cat,
      winner: '',
      carName: ''
    })),
    classConfig: initialClassConfig,
    grandFinalsKey: initialGrandFinalsKey,
    avgMethod: settings.avgMethod || 'dropSlowest', // 'dropSlowest' or 'allHeats'
    excludeGrandFinalsWinners: settings.excludeGrandFinalsWinners ?? true, // Default to true (GrandPrix Race Manager default)
    numGrandFinalsWinners: settings.numGrandFinalsWinners || 3, // Default 3 (top 3 get overall trophies)
    reportLayout: settings.reportLayout || null // Will be initialized below
  })

  // Build initial layout items from class config
  const buildInitialLayout = useCallback(() => {
    const denClasses = initialClassConfig.filter(c => c.key !== initialGrandFinalsKey)
    const leftItems = []
    const rightItems = []
    
    // Distribute dens between columns, alternating
    denClasses.forEach((cls, i) => {
      const item = {
        id: `den-${cls.key}`,
        type: 'den',
        key: cls.key,
        name: cls.name,
        racerCount: (raceData.resultsByClass[cls.key] || []).length
      }
      if (i % 2 === 0) leftItems.push(item)
      else rightItems.push(item)
    })
    
    // Add grand finals to left column
    if (initialGrandFinalsKey) {
      leftItems.push({
        id: 'grand-finals',
        type: 'grand-finals',
        key: initialGrandFinalsKey,
        name: initialClassConfig.find(c => c.key === initialGrandFinalsKey)?.name || 'Grand Finals',
        racerCount: (raceData.resultsByClass[initialGrandFinalsKey] || []).length
      })
    }
    
    // Add slope chart to right column (only if grand finals exists)
    if (initialGrandFinalsKey) {
      rightItems.push({
        id: 'slope-chart',
        type: 'slope-chart',
        name: 'Slope Chart',
        racerCount: 0 // Fixed height
      })
    }
    
    return { leftColumn: leftItems, rightColumn: rightItems }
  }, [initialClassConfig, initialGrandFinalsKey, raceData.resultsByClass])

  // Initialize layout if not set
  useMemo(() => {
    if (!formData.reportLayout) {
      const initialLayout = buildInitialLayout()
      setFormData(prev => ({ ...prev, reportLayout: initialLayout }))
    }
  }, []) // Only run once on mount

  // Drag state
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const [dragColumn, setDragColumn] = useState(null)

  const handleDragStart = useCallback((e, item, column) => {
    dragItem.current = { item, column }
    setDragColumn(column)
    e.dataTransfer.effectAllowed = 'move'
    // Add drag image styling
    e.target.style.opacity = '0.5'
  }, [])

  const handleDragOver = useCallback((e, targetItem, targetColumn) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverItem.current = { item: targetItem, column: targetColumn }
  }, [])

  const handleDrop = useCallback((e, targetItem, targetColumn) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!dragItem.current) return
    
    const { item: sourceItem, column: sourceColumn } = dragItem.current
    
    // Don't do anything if dropping on itself
    if (sourceItem.id === targetItem?.id) {
      dragItem.current = null
      dragOverItem.current = null
      setDragColumn(null)
      return
    }

    setFormData(prev => {
      const layout = { ...prev.reportLayout }
      const sourceList = [...layout[sourceColumn]]
      const targetList = sourceColumn === targetColumn ? sourceList : [...layout[targetColumn]]

      // Remove from source
      const sourceIndex = sourceList.findIndex(i => i.id === sourceItem.id)
      if (sourceIndex === -1) return prev
      sourceList.splice(sourceIndex, 1)

      // Find target index
      let targetIndex = targetItem 
        ? targetList.findIndex(i => i.id === targetItem.id)
        : targetList.length
      
      // If moving within same column and source was before target, adjust
      if (sourceColumn === targetColumn && sourceIndex < targetIndex) {
        targetIndex--
      }

      // Insert at target
      if (sourceColumn === targetColumn) {
        sourceList.splice(targetIndex, 0, sourceItem)
        layout[sourceColumn] = sourceList
      } else {
        targetList.splice(targetIndex, 0, sourceItem)
        layout[sourceColumn] = sourceList
        layout[targetColumn] = targetList
      }

      return { ...prev, reportLayout: layout }
    })

    dragItem.current = null
    dragOverItem.current = null
    setDragColumn(null)
  }, [])

  const handleDragEnd = useCallback((e) => {
    // Reset opacity
    if (e?.target) {
      e.target.style.opacity = '1'
    }
    dragItem.current = null
    dragOverItem.current = null
    setDragColumn(null)
  }, [])

  const handleColumnDrop = useCallback((e, targetColumn) => {
    e.preventDefault()
    if (!dragItem.current) return
    
    // Dropping on empty column space - add to end
    handleDrop(e, null, targetColumn)
  }, [handleDrop])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleAwardChange = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      designAwards: prev.designAwards.map((award, i) => 
        i === index ? { ...award, [field]: value } : award
      )
    }))
  }, [])

  const addAwardCategory = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      designAwards: [...prev.designAwards, { category: '', winner: '', carName: '' }]
    }))
  }, [])

  const removeAwardCategory = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      designAwards: prev.designAwards.filter((_, i) => i !== index)
    }))
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    onComplete(formData)
  }, [formData, onComplete])

  // Get the averaging key based on method
  const avgKey = formData.avgMethod === 'allHeats' ? 'avgTime' : 'avgExceptSlowest'

  // Get list of racers for autocomplete (name only for winner field)
  const racerOptions = raceData.racers.map(r => 
    `${r.firstName} ${r.lastName}`
  )
  
  // Get list of car names for autocomplete
  const carNameOptions = useMemo(() => {
    const names = new Set()
    raceData.racers.forEach(r => {
      if (r.carName) names.add(r.carName)
    })
    return Array.from(names)
  }, [raceData.racers])
  
  // Compute top racer for each class based on current avgMethod
  const getTopRacer = useCallback((classKey) => {
    const results = raceData.resultsByClass[classKey] || []
    if (results.length === 0) return null
    
    // Sort by the selected avg method
    const sorted = [...results].sort((a, b) => (a[avgKey] || 0) - (b[avgKey] || 0))
    return sorted[0]
  }, [raceData.resultsByClass, avgKey])

  return (
    <div className="max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Report Configuration</h2>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-derby-blue"
              placeholder="Pack 24 Pinewood Derby"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-derby-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date & Time
            </label>
            <input
              type="text"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-derby-blue"
              placeholder="February 7th 8:40 AM to 10:37 AM"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-derby-blue"
              placeholder="School Gymnasium"
            />
          </div>
        </div>

        {/* Average Calculation Method */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h3 className="font-medium text-gray-700 mb-3">Average Time Calculation</h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="avgMethod"
                value="dropSlowest"
                checked={formData.avgMethod === 'dropSlowest'}
                onChange={handleInputChange}
                className="text-derby-blue"
              />
              <span>Drop slowest heat (recommended)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="avgMethod"
                value="allHeats"
                checked={formData.avgMethod === 'allHeats'}
                onChange={handleInputChange}
                className="text-derby-blue"
              />
              <span>Average all heats</span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            "Drop slowest" excludes each racer's worst time, matching official scoring.
          </p>
        </div>

        {/* Exclude Grand Finals Winners from Den Rankings */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-medium text-gray-700 mb-3">Grand Finals Winner Exclusion</h3>
          <p className="text-sm text-gray-600 mb-3">
            In GrandPrix Race Manager, this is under "Software Settings → Standings → Other Standing Options".
            When enabled, the top finishers in Grand Finals don't receive den trophies (since they already won larger overall trophies).
            The 1st/2nd/3rd places for each den will skip over these racers.
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="excludeGrandFinalsWinners"
                checked={formData.excludeGrandFinalsWinners}
                onChange={(e) => setFormData(prev => ({ ...prev, excludeGrandFinalsWinners: e.target.checked }))}
                className="w-4 h-4 text-derby-blue rounded"
              />
              <span>Exclude Grand Finals Winners from Den Rankings</span>
            </label>
            {formData.excludeGrandFinalsWinners && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Number of winners:</label>
                <input
                  type="number"
                  name="numGrandFinalsWinners"
                  min="1"
                  max="10"
                  value={formData.numGrandFinalsWinners}
                  onChange={(e) => setFormData(prev => ({ ...prev, numGrandFinalsWinners: parseInt(e.target.value) || 3 }))}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-derby-blue"
                />
              </div>
            )}
          </div>
        </div>

        {/* Classes/Dens Summary (read-only, set in mapping step) */}
        <div className="mb-8">
          <h3 className="font-medium text-gray-700 mb-3">Classes/Dens Included</h3>
          <p className="text-sm text-gray-500 mb-3">
            Classes are configured in the previous mapping step. The following dens will be included:
          </p>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Class/Den Name</th>
                  <th className="px-3 py-2 text-center w-20"># Racers</th>
                  <th className="px-3 py-2 text-left">Top Racer</th>
                </tr>
              </thead>
              <tbody>
                {formData.classConfig.map((cls) => {
                  const results = raceData.resultsByClass[cls.key] || []
                  const topRacer = getTopRacer(cls.key)
                  const isGrandFinals = formData.grandFinalsKey === cls.key
                  return (
                    <tr key={cls.key} className={`border-t ${isGrandFinals ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">
                        {cls.name}
                        {isGrandFinals && <span className="ml-2 text-xs text-yellow-600">★ Finals</span>}
                      </td>
                      <td className="px-3 py-2 text-center">{results.length}</td>
                      <td className="px-3 py-2">
                        {topRacer ? `${topRacer.firstName} ${topRacer.lastName}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Layout Preview - Interactive Drag & Drop */}
        <div className="mb-8">
          <h3 className="font-medium text-gray-700 mb-2">Page Layout</h3>
          <p className="text-sm text-gray-500 mb-3">
            Drag items to reorder or move between columns. Heights are proportional to racer count.
            Balance the columns so content fits on one page.
          </p>
          
          {formData.reportLayout && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {/* Two-column layout area */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Left Column */}
                <div 
                  className={`space-y-2 min-h-[100px] p-2 rounded border-2 border-dashed transition-colors ${
                    dragColumn === 'rightColumn' ? 'border-blue-300 bg-blue-50' : 'border-transparent'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleColumnDrop(e, 'leftColumn')}
                >
                  <div className="text-xs font-medium text-gray-400 mb-1">Left Column</div>
                  {formData.reportLayout.leftColumn.map((item) => {
                    const height = item.type === 'slope-chart' 
                      ? CHART_HEIGHT 
                      : Math.max(MIN_ITEM_HEIGHT, item.racerCount * HEIGHT_PER_RACER)
                    const bgColor = item.type === 'grand-finals' 
                      ? 'bg-yellow-100 border-yellow-300' 
                      : item.type === 'slope-chart'
                        ? 'bg-green-100 border-green-300'
                        : 'bg-white border-gray-200'
                    return (
                      <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, 'leftColumn')}
                        onDragOver={(e) => handleDragOver(e, item, 'leftColumn')}
                        onDrop={(e) => handleDrop(e, item, 'leftColumn')}
                        onDragEnd={handleDragEnd}
                        className={`${bgColor} border rounded p-2 cursor-move hover:shadow-md transition-shadow text-xs`}
                        style={{ minHeight: `${height}px` }}
                      >
                        <div className="font-bold text-derby-blue flex items-center gap-1">
                          <span className="text-gray-400">☰</span>
                          {item.name}
                        </div>
                        {item.racerCount > 0 && (
                          <div className="text-gray-500">{item.racerCount} racers</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Right Column */}
                <div 
                  className={`space-y-2 min-h-[100px] p-2 rounded border-2 border-dashed transition-colors ${
                    dragColumn === 'leftColumn' ? 'border-blue-300 bg-blue-50' : 'border-transparent'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleColumnDrop(e, 'rightColumn')}
                >
                  <div className="text-xs font-medium text-gray-400 mb-1">Right Column</div>
                  {formData.reportLayout.rightColumn.map((item) => {
                    const height = item.type === 'slope-chart' 
                      ? CHART_HEIGHT 
                      : Math.max(MIN_ITEM_HEIGHT, item.racerCount * HEIGHT_PER_RACER)
                    const bgColor = item.type === 'grand-finals' 
                      ? 'bg-yellow-100 border-yellow-300' 
                      : item.type === 'slope-chart'
                        ? 'bg-green-100 border-green-300'
                        : 'bg-white border-gray-200'
                    return (
                      <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, 'rightColumn')}
                        onDragOver={(e) => handleDragOver(e, item, 'rightColumn')}
                        onDrop={(e) => handleDrop(e, item, 'rightColumn')}
                        onDragEnd={handleDragEnd}
                        className={`${bgColor} border rounded p-2 cursor-move hover:shadow-md transition-shadow text-xs`}
                        style={{ minHeight: `${height}px` }}
                      >
                        <div className="font-bold text-derby-blue flex items-center gap-1">
                          <span className="text-gray-400">☰</span>
                          {item.name}
                        </div>
                        {item.racerCount > 0 && (
                          <div className="text-gray-500">{item.racerCount} racers</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Column height indicators */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-center">
                <div className="text-gray-500">
                  Height: {formData.reportLayout.leftColumn.reduce((sum, item) => 
                    sum + (item.type === 'slope-chart' ? 6 : item.racerCount), 0
                  )} units
                </div>
                <div className="text-gray-500">
                  Height: {formData.reportLayout.rightColumn.reduce((sum, item) => 
                    sum + (item.type === 'slope-chart' ? 6 : item.racerCount), 0
                  )} units
                </div>
              </div>
              
              {/* Fixed bottom elements */}
              <div className="border-t pt-3 space-y-2">
                <div className="bg-purple-100 border border-purple-300 rounded p-2 text-xs">
                  <div className="font-bold text-derby-blue">Histogram (full width - always at bottom)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Design Awards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">Design Award Winners</h3>
            <button
              type="button"
              onClick={addAwardCategory}
              className="text-derby-blue hover:text-blue-700 text-sm font-medium"
            >
              + Add Category
            </button>
          </div>

          <div className="space-y-3">
            {formData.designAwards.map((award, index) => (
              <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded">
                <div className="flex-1">
                  <input
                    type="text"
                    value={award.category}
                    onChange={(e) => handleAwardChange(index, 'category', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-derby-blue"
                    placeholder="Category"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={award.winner}
                    onChange={(e) => handleAwardChange(index, 'winner', e.target.value)}
                    list={`racers-${index}`}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-derby-blue"
                    placeholder="Winner (Scout Name)"
                  />
                  <datalist id={`racers-${index}`}>
                    {racerOptions.map((name, i) => (
                      <option key={i} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={award.carName}
                    onChange={(e) => handleAwardChange(index, 'carName', e.target.value)}
                    list={`carnames-${index}`}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-derby-blue"
                    placeholder="Car Name"
                  />
                  <datalist id={`carnames-${index}`}>
                    {carNameOptions.map((name, i) => (
                      <option key={i} value={name} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={() => removeAwardCategory(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 rounded font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded font-medium bg-derby-blue text-white hover:bg-blue-700 transition-colors"
          >
            Generate Report →
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReportSettings
