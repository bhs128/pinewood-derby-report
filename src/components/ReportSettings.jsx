import { useState, useCallback } from 'react'

const DEFAULT_DESIGN_CATEGORIES = [
  'Most Likely to Win',
  'Most Humorous',
  'Most Patriotic',
  'Most Creative',
  'Best Paint Job',
  'Most Realistic'
]

function ReportSettings({ raceData, settings, onComplete, onBack }) {
  const [formData, setFormData] = useState({
    title: settings.title || 'Pack Pinewood Derby',
    year: settings.year || new Date().getFullYear(),
    date: settings.date || '',
    location: settings.location || '',
    designAwards: settings.designAwards || DEFAULT_DESIGN_CATEGORIES.map(cat => ({
      category: cat,
      winner: '',
      carName: ''
    }))
  })

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

  // Get list of racers for autocomplete
  const racerOptions = raceData.racers.map(r => 
    `${r.firstName} ${r.lastName} (#${r.carNumber})`
  )

  return (
    <div className="max-w-4xl mx-auto">
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

        {/* Race Data Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <h3 className="font-medium text-gray-700 mb-3">Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-derby-blue">{raceData.racers.length}</div>
              <div className="text-gray-500">Racers</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-derby-blue">{raceData.classes.length}</div>
              <div className="text-gray-500">Classes/Dens</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-derby-blue">{raceData.totalHeats}</div>
              <div className="text-gray-500">Total Heats</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-derby-blue">{raceData.totalRaces}</div>
              <div className="text-gray-500">Individual Races</div>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            <strong>Classes found:</strong> {raceData.classes.map(c => c.name).join(', ')}
          </div>
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
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-derby-blue"
                    placeholder="Car Name"
                  />
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
