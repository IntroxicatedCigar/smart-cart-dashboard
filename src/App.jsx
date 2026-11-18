import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { ShoppingCart, RefreshCw, Clock, Receipt, Search, CheckCircle, AlertCircle, Check } from 'lucide-react'

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [approvingId, setApprovingId] = useState(null)

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

  const approveTransaction = async (id) => {
    setApprovingId(id)
    const { error } = await supabase
      .from('cart_transactions')
      .update({ status: 'paid' })
      .eq('id', id)

    if (!error) {
      setTransactions((current) =>
        current.map((tx) => (tx.id === id ? { ...tx, status: 'paid' } : tx))
      )
    } else {
      console.error("Error approving transaction:", error)
    }
    setApprovingId(null)
  }

  useEffect(() => {
    fetchTransactions()

    const subscription = supabase
      .channel('cart_transactions_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cart_transactions' }, (payload) => {
        setTransactions((current) => [payload.new, ...current])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cart_transactions' }, (payload) => {
        setTransactions((current) =>
          current.map((tx) => (tx.id === payload.new.id ? payload.new : tx))
        )
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toString().includes(searchQuery.trim())
  )

  const pendingCount = transactions.filter(tx => tx.status === 'pending').length

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 font-sans selection:bg-blue-200 overflow-hidden">
      
      {/* Top Navigation Bar */}
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

      {/* Main Dashboard Layout */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Panel */}
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

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
             <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold">System Status</h2>
             
             <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Checkouts</span>
                <span className="text-2xl font-bold text-slate-900">{transactions.length}</span>
             </div>

             <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <span className="text-slate-600">Awaiting Cashier</span>
                <span className={`text-xl font-bold px-2.5 py-0.5 rounded-full ${pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                  {pendingCount}
                </span>
             </div>

             <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md font-medium text-sm border border-emerald-100">
               <CheckCircle size={16} /> Data Pipeline Active
             </div>
          </div>
        </aside>

        {/* Live Feed Container */}
        <section className="lg:col-span-3 flex flex-col overflow-hidden">
          
          <div className="flex-none flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={24} className="text-slate-500" /> 
              {searchQuery ? "Search Results" : "Live Receipts"}
            </h2>
          </div>

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
                {filteredTransactions.map((tx) => {
                  const isPending = tx.status === 'pending'
                  return (
                    <div 
                      key={tx.id} 
                      className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden flex flex-col transition-all ${
                        isPending ? 'border-amber-400 shadow-md' : 'border-slate-200'
                      }`}
                    >
                      {/* Receipt Header */}
                      <div className={`p-4 border-b flex justify-between items-start ${isPending ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Transaction ID</span>
                            {isPending ? (
                              <span className="flex items-center gap-1 bg-amber-200 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                <AlertCircle size={12} /> Awaiting Approval
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                <Check size={12} /> Paid & Cleared
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-lg font-bold text-slate-900">#{tx.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mb-1">
                            <Clock size={12}/> Time
                          </div>
                          <div className="font-medium text-slate-700 text-sm">{new Date(tx.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      {/* Receipt Items */}
                      <div className="p-4 flex-1">
                        <ul className="space-y-2 text-sm font-mono">
                          {tx.receipt_items && tx.receipt_items.map((item, idx) => {
                            const qty = item.qty || 1
                            const lineTotal = Number(item.price) * qty
                            return (
                              <li key={idx} className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2 truncate pr-4">
                                  <span className="text-slate-700 truncate">{item.name}</span>
                                  {qty > 1 && (
                                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">
                                      x{qty}
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-900 font-semibold whitespace-nowrap">
                                  ${lineTotal.toFixed(2)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      {/* Receipt Footer & Cashier Action Button */}
                      <div className="bg-slate-900 text-white p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium tracking-wide text-slate-300">TOTAL DUE</span>
                          <span className="text-2xl font-bold">${Number(tx.cart_total).toFixed(2)}</span>
                        </div>

                        {isPending && (
                          <button
                            onClick={() => approveTransaction(tx.id)}
                            disabled={approvingId === tx.id}
                            className="cursor-pointer w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <CheckCircle size={18} />
                            {approvingId === tx.id ? "Clearing Cart..." : "Approve & Clear Cart"}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}