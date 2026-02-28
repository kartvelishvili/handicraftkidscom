import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const DotsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalDots, setTotalDots] = useState(0);
  const [history, setHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDots = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-dots');
      
      if (error) throw error;

      setTotalDots(data.total_dots || 0);
      setHistory(data.history || []);
      setLastUpdated(data.last_updated);
    } catch (err) {
      console.error('Error fetching dots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDots();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#57c5cf]/10 to-[#f292bc]/10">
        <Helmet>
          <title>Loading Dots... - Handicraft</title>
        </Helmet>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-[#57c5cf] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#57c5cf]/10 to-[#f292bc]/10 p-4">
        <Helmet>
          <title>Error Loading Dots - Handicraft</title>
        </Helmet>
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Circle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 font-body mb-6">{error}</p>
          <Button
            onClick={fetchDots}
            className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white rounded-full px-6 py-3 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#57c5cf]/10 via-white to-[#f292bc]/10 py-16 px-4">
      <Helmet>
        <title>Dots Journey - Handicraft</title>
        <meta name="description" content="Watch our dots grow over time, one every 5 days" />
      </Helmet>

      <div className="container mx-auto max-w-4xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#57c5cf] rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative bg-white rounded-full p-8 shadow-2xl border-4 border-[#57c5cf]">
                <span className="text-6xl font-heading font-bold text-[#57c5cf]">
                  {totalDots}
                </span>
              </div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 bg-gradient-to-r from-[#57c5cf] to-[#f292bc] bg-clip-text text-transparent">
            Dots Journey
          </h1>
          <p className="text-lg text-gray-600 font-body mb-2">
            Growing one dot every 5 days
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-400 font-body flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </motion.div>

        {/* Visual Dots Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-8 mb-12 shadow-xl border border-gray-100"
        >
          <div className="flex flex-wrap justify-center gap-3">
            <AnimatePresence>
              {Array.from({ length: totalDots }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#57c5cf] to-[#f292bc] rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-[#57c5cf] to-[#4bc0cb] rounded-full shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-xs">{index + 1}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
        >
          <h2 className="text-2xl font-heading font-bold mb-8 text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#f292bc]" />
            Timeline
          </h2>

          <div className="space-y-6">
            {history.map((item, index) => (
              <motion.div
                key={item.dot_number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-4 group"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#57c5cf] to-[#4bc0cb] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Circle className="w-5 h-5 text-white fill-current" />
                  </div>
                  {index < history.length - 1 && (
                    <div className="absolute left-1/2 top-10 w-0.5 h-8 bg-gradient-to-b from-[#57c5cf] to-transparent -translate-x-1/2" />
                  )}
                </div>

                <div className="flex-grow pt-1">
                  <div className="bg-gradient-to-r from-[#57c5cf]/5 to-transparent rounded-2xl p-4 group-hover:from-[#57c5cf]/10 transition-colors">
                    <h3 className="font-heading font-bold text-lg text-gray-800 mb-1">
                      Day {item.dot_number}
                    </h3>
                    <p className="text-sm text-gray-600 font-body">
                      {formatDate(item.added_at)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <Button
            onClick={fetchDots}
            className="bg-[#f292bc] hover:bg-[#e07aa3] text-white rounded-full px-8 py-4 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default DotsPage;