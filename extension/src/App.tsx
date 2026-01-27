import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Depop');
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    console.log(`${activeTab}ing for ${selectedPlatform} user: ${username}`);
    // Future logic: trigger content script with storage
  };

  const handleViewData = () => {
    console.log("View Data");
    // Future logic: open data view
  };

  return (
    <div className="container">
      <header>
        <h1>e-crosslister</h1>
      </header>
      
      <div className="tabs">
        <button 
          className={activeTab === 'download' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('download')}
        >
          Download
        </button>
        <button 
          className={activeTab === 'upload' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('upload')}
        >
          Upload
        </button>
      </div>

      <div className="content">
        <div className="platforms-col">
          <button 
            className={selectedPlatform === 'Depop' ? 'active' : ''} 
            onClick={() => setSelectedPlatform('Depop')}
          >
            Depop
          </button>
          <button 
             className={selectedPlatform === 'Vinted' ? 'active' : ''}
             onClick={() => setSelectedPlatform('Vinted')}
          >
            Vinted
          </button>
        </div>

        <div className="actions-col">
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>

      <footer>
        <button className="view-data-btn" onClick={handleViewData}>
          View Data
        </button>
      </footer>
    </div>
  )
}

export default App
