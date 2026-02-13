import { useCallback, useState } from 'react'

function FileUpload({ onFilesUploaded }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = [...e.dataTransfer.files].filter(f => 
      f.name.endsWith('.sqlite') || f.name.endsWith('.db')
    )
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
    }
  }, [])

  const handleFileInput = useCallback((e) => {
    const files = [...e.target.files]
    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleContinue = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesUploaded(selectedFiles)
    }
  }, [selectedFiles, onFilesUploaded])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Race Data</h2>
        <p className="text-gray-600 mb-6">
          Upload your SQLite database file(s) from GrandPrix Race Manager. 
          You can find these in your <code className="bg-gray-100 px-1 rounded">Documents/Lisano Enterprises/GrandPrix Race Manager/Data</code> folder.
        </p>

        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-derby-blue bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600 mb-2">Drag and drop SQLite files here, or</p>
          <label className="inline-block">
            <span className="bg-derby-blue text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition-colors">
              Browse Files
            </span>
            <input
              type="file"
              className="hidden"
              accept=".sqlite,.db"
              multiple
              onChange={handleFileInput}
            />
          </label>
          <p className="text-gray-400 text-sm mt-2">Accepts .sqlite and .db files</p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2">Selected Files:</h3>
            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-derby-blue mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    <span className="text-gray-800">{file.name}</span>
                    <span className="text-gray-400 text-sm ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-medium text-blue-800 mb-1">💡 Tip</h4>
          <p className="text-blue-700 text-sm">
            If you have separate files for den races and grand finals, upload both. 
            The app will automatically merge the data.
          </p>
        </div>

        {/* Continue Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleContinue}
            disabled={selectedFiles.length === 0}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              selectedFiles.length > 0
                ? 'bg-derby-blue text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileUpload
