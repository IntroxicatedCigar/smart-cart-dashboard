import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { ShoppingCart, RefreshCw, Clock, Receipt, Search, CheckCircle } from 'lucide-react'

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cart_transactions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setTransactions(data)
    } else {
      console.error("Error fetching data:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()

    const subscription = supabase
      .channel('cart_transactions_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cart_transactions' }, (payload) => {
        setTransactions((current) => [payload.new, ...current])
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toString().includes(searchQuery)
  )

  return (
    // Locked screen height, no full-page scrolling
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 font-sans selection:bg-blue-200 overflow-hidden">
      
      {/* Top Navigation Bar (Fixed Height) */}
      <header className="flex-none bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <ShoppingCart size={28} className="text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">Smart Cart <span className="font-light text-slate-400">| Terminal POS</span></h1>
        </div>
        <button 
          onClick={fetchTransactions}
          className="cursor-pointer flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-md transition-all shadow-sm text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Sync Cloud
        </button>
      </header>

      {/* Main Dashboard Layout (Fills remaining height) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Panel (Static) */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Search size={16} /> Scan Cart ID
            </h2>
            <input 
              type="text"
              placeholder="Enter Cart or TX ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg"
              autoFocus
            />
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">System Status</h2>
             <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600">Total Checkouts</span>
                <span className="text-2xl font-bold text-slate-900">{transactions.length}</span>
             </div>
             <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md font-medium text-sm border border-emerald-100">
               <CheckCircle size={16} /> Data Pipeline Active
             </div>
          </div>
        </aside>

        {/* Live Feed Container (Internal Scrolling) */}
        <section className="lg:col-span-3 flex flex-col overflow-hidden">
          
          {/* Header stays pinned */}
          <div className="flex-none flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={24} className="text-slate-500" /> 
              {searchQuery ? "Search Results" : "Live Receipts"}
            </h2>
          </div>

          {/* Scrolling area just for the receipts */}
          <div className="flex-1 overflow-y-auto pr-2 pb-6">
            {loading && transactions.length === 0 ? (
              <div className="flex justify-center py-20">
                <RefreshCw size={32} className="animate-spin text-slate-400" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                {searchQuery ? "No cart found with that ID." : "Waiting for incoming cart transactions..."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-start">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Transaction ID</div>
                        <div className="font-mono text-lg font-bold text-slate-900">#{tx.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mb-1">
                          <Clock size={12}/> Time
                        </div>
                        <div className="font-medium text-slate-700 text-sm">{new Date(tx.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    <div className="p-4 flex-1">
                      <ul className="space-y-2 text-sm font-mono">
                        {tx.receipt_items && tx.receipt_items.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                            <span className="text-slate-700 truncate pr-4">{item.name}</span>
                            <span className="text-slate-900 whitespace-nowrap">${Number(item.price).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                       <span className="font-medium tracking-wide">TOTAL DUE</span>
                       <span className="text-2xl font-bold">${Number(tx.cart_total).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}