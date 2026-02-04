import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { developerAPI } from '../services/api';
import { Star, MapPin, Clock, DollarSign, Github, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const Developers = () => {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredDevelopers, setFilteredDevelopers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('');

  useEffect(() => {
    fetchDevelopers();
  }, []);

  useEffect(() => {
    filterDevelopers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developers, searchTerm, filterSkill]);

  const fetchDevelopers = async () => {
    try {
      setLoading(true);
      const response = await developerAPI.getAvailable();
      setDevelopers(response.data);
    } catch (error) {
      console.error('[DevHire] Fetch developers error:', error);
      toast.error('Failed to load developers');
    } finally {
      setLoading(false);
    }
  };

  const filterDevelopers = () => {
    let filtered = developers;

    if (searchTerm) {
      filtered = filtered.filter(
        (dev) =>
          dev.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dev.skills.some((skill) =>
            skill.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (filterSkill) {
      filtered = filtered.filter((dev) =>
        dev.skills.some(
          (skill) => skill.toLowerCase() === filterSkill.toLowerCase()
        )
      );
    }

    setFilteredDevelopers(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading developers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Developers</h1>
          <p className="text-xl text-gray-600">
            Hire talented developers for instant video consultations
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by name or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Skills</option>
              <option value="React">React</option>
              <option value="Node.js">Node.js</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="TypeScript">TypeScript</option>
              <option value="AWS">AWS</option>
              <option value="Database">Database</option>
            </select>
          </div>
        </div>

        {/* Developers Grid */}
        {filteredDevelopers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevelopers.map((dev) => (
              <div
                key={dev.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {dev.full_name}
                      </h3>
                      {dev.experience_years && (
                        <p className="text-sm text-gray-600">
                          {dev.experience_years} years experience
                        </p>
                      )}
                    </div>
                    {dev.profile_picture_url && (
                      <img
                        src={dev.profile_picture_url}
                        alt={dev.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={`${
                            i < Math.round(Number(dev.rating) || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {(Number(dev.rating) || 0).toFixed(1)} ({dev.total_reviews ?? 0} reviews)
                    </span>
                  </div>

                  {/* Bio */}
                  {dev.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{dev.bio}</p>
                  )}
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Rate */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Hourly Rate</span>
                      <div className="flex items-center gap-1">
                        <DollarSign size={20} className="text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {dev.hourly_rate}
                        </span>
                        <span className="text-gray-600">/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {dev.skills && dev.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {dev.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {dev.skills.length > 3 && (
                          <span className="text-xs text-gray-500 py-1">
                            +{dev.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={16} />
                      {dev.total_hours_worked}h worked
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} />
                      Available
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex gap-2 mb-4">
                    {dev.github_url && (
                      <a
                        href={dev.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-gray-900 transition"
                      >
                        <Github size={18} />
                      </a>
                    )}
                    {dev.portfolio_url && (
                      <a
                        href={dev.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-gray-900 transition"
                      >
                        <Globe size={18} />
                      </a>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    to={`/developer/${dev.id}`}
                    className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">
              {developers.length === 0
                ? 'No developers available at the moment'
                : 'No developers matching your criteria'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Developers;
