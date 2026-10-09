import { renderBusinessBasics, renderBrandProfile } from './BusinessIdentitySections';
import { renderAudience } from './BusinessAudienceSection';
import { renderBrandAssets, renderCompetitors } from './BusinessAssetSections';
import LookupState from '@/components/ui/LookupState';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { apiBaseUrl } from '../../lib/runtime/config';



import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';
import {
  useAppSearchParams as useSearchParams,
  useAppLocation as useLocation,
} from '../../core/navigation';
import { useSession as useAuth } from '../../core/session';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/services/queryClient';
import { useLanguage } from '@/i18n';
import DataState from '@/components/ui/DataState';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from './components/accountRecovery';
import { sameJsonValue } from '@/lib/jsonAcknowledgment';
import { parseBusiness } from '@/lib/settingsRecovery';
import Badge from '@/components/ui/Badge';
import { useLookups } from '../../hooks/useData';
import { workspacesAPI } from '@/services/domains/accounts';
import ConnectedAccounts from '@/components/ConnectedAccounts';

import PageHeader from '../../components/layout/PageHeader';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { Loader2, Save, Sparkles } from "lucide-react";
const API_BASE = apiBaseUrl();
const CYAN = 'var(--brand-primary)';
const CYAN_SOFT = 'rgba(31, 182, 207, 0.16)';
const BUSINESS_CATEGORIES = [
  'Electronics',
  'Retail',
  'Services',
  'Food & Beverage',
  'Healthcare',
  'Education',
  'Real Estate',
  'Automotive',
  'Hospitality',
  'Manufacturing',
  'Technology',
  'Fashion',
  'Sports & Recreation',
  'Beauty & Wellness',
  'Home & Garden',
  'Other',
];
const BRAND_TONES = [
  {
    value: 'professional',
    label: 'Professional',
  },
  {
    value: 'casual',
    label: 'Casual',
  },
  {
    value: 'funny',
    label: 'Funny',
  },
  {
    value: 'inspirational',
    label: 'Inspirational',
  },
  {
    value: 'urgent',
    label: 'Urgent',
  },
  {
    value: 'friendly',
    label: 'Friendly',
  },
];
const SOCIAL_PLATFORMS = [
  {
    value: 'facebook',
    label: 'Facebook',
  },
  {
    value: 'instagram',
    label: 'Instagram',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
  },
  {
    value: 'youtube',
    label: 'YouTube',
  },
  {
    value: 'google_my_business',
    label: 'Google My Business',
  },
];
const GENDERS = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'male',
    label: 'Male',
  },
  {
    value: 'female',
    label: 'Female',
  },
  {
    value: 'non_binary',
    label: 'Non-binary',
  },
  {
    value: 'unspecified',
    label: 'Unspecified',
  },
];
export default function SettingsPage({ clientId: propClientId }) {
  return <AccountScope>{(identity, enabled, key) => <SettingsBody key={`${key}:${propClientId}:${enabled}`} clientId={propClientId} identity={identity} enabled={enabled} />}</AccountScope>;
}
function SettingsBody({ clientId: propClientId, identity, enabled }) {
  const { user } = useAuth();
  const clientId = propClientId || user?.client_id;
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const resource = useAccountRead('business-profile', [...identity, clientId], enabled && !!clientId, signal => workspacesAPI.get(clientId, signal), v => parseBusiness(v, clientId));
  const action = useCheckedAction();
  const initialized = useRef(false);
  const heading = useRef(null);
  const lookupResource = useLookups();
  const { lookups, loading: lookupsLoading } = lookupResource;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const didRefetch = useRef(false);
  const [oauthMsg, setOauthMsg] = useState(null); // { type: 'success'|'error', text }

  // Business Profile State
  const profileLoading = resource.query.isPending;
  const saving = action.busy;
  const [activeTab, setActiveTab] = useState('accounts');
  const [formData, setFormData] = useState({
    // Business Basics
    name: '',
    company: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    website: '',
    gmb_url: '',
    // Brand Profile
    business_category: '',
    business_subcategories: [],
    brand_description: '',
    usp: '',
    brand_tone: '',
    target_audience: '',
    gender: 'all',
    business_location: '',
    target_locations: [],
    // Assets
    profile_image: null,
    product_images: [],
    brand_assets: {},
    // Competitors
    competitors: [],
  });

  // Initialize once per captured context. Refreshes never overwrite an editable draft.
  useEffect(() => {
    if (!resource.data || initialized.current) return;
    initialized.current = true;
    const client = resource.data;
    queueMicrotask(() => {
      if (!action.alive.current) return;
      setFormData({
          name: client.name || '',
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          whatsapp_number: client.whatsapp_number || '',
          website: client.website || '',
          gmb_url: client.gmb_url || '',
          business_category: client.business_category || '',
          business_subcategories: client.business_subcategories || [],
          brand_description: client.brand_description || '',
          usp: client.usp || '',
          brand_tone: client.brand_tone || '',
          target_audience: client.target_audience || '',
          gender: client.gender || 'all',
          business_location: client.business_location || '',
          target_locations: client.target_locations || [],
          profile_image: null,
          // File objects can't be pre-loaded
          product_images: [],
          brand_assets: client.brand_assets || {},
          competitors: (client.competitors || []).map((comp) => ({
            ...comp,
            social_links: Array.isArray(comp.social_links)
              ? comp.social_links
              : Object.entries(comp.social_links || {}).map(
                  ([platform, url]) => ({
                    platform,
                    url,
                  }),
                ),
          })),
        });
    });
  }, [resource.data, action.alive]);

  // Handle OAuth result — wait until clientId is available before refetching
  useEffect(() => {
    if (!clientId) return; // don't run until we know who we are
    if (didRefetch.current) return;

    // Check router state (from OAuthCallbackPage) OR legacy query params
    const connected =
      location.state?.oauthConnected || searchParams.get('connected');
    const error = location.state?.oauthError || searchParams.get('error');
    if (!connected && !error) return;
    didRefetch.current = true;

    // Clear query params if present
    if (searchParams.get('connected') || searchParams.get('error')) {
      setSearchParams(
        {},
        {
          replace: true,
        },
      );
    }

    // Refetch status now that clientId is ready
    void queryClient.invalidateQueries({ queryKey: QK.connections(Number(clientId)) });
    if (connected) {
      // A return URL is not proof that the account is connected or healthy.
      setOauthMsg({ type: 'info', text: t('connections.oauthReturned') });
    } else {
      setOauthMsg({ type: 'error', text: t(error === 'account_mismatch' ? 'connections.mismatch' : 'connections.mutationFailed') });
    }

  }, [clientId, location.state, searchParams, queryClient, setSearchParams, t]);

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubcategoryToggle = (subcategory) => {
    setFormData((prev) => ({
      ...prev,
      business_subcategories: prev.business_subcategories.includes(subcategory)
        ? prev.business_subcategories.filter((s) => s !== subcategory)
        : [...prev.business_subcategories, subcategory],
    }));
  };
  const handleLocationToggle = (location) => {
    setFormData((prev) => ({
      ...prev,
      target_locations: prev.target_locations.includes(location)
        ? prev.target_locations.filter((l) => l !== location)
        : [...prev.target_locations, location],
    }));
  };
  const handleFileUpload = (field, files) => {
    if (field === 'product_images') {
      setFormData((prev) => ({
        ...prev,
        product_images: [...prev.product_images, ...Array.from(files)],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: files[0],
      }));
    }
  };
  const removeFile = (field, index) => {
    if (field === 'product_images') {
      setFormData((prev) => ({
        ...prev,
        product_images: prev.product_images.filter((_, i) => i !== index),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };
  const addCompetitor = () => {
    setFormData((prev) => ({
      ...prev,
      competitors: [
        ...prev.competitors,
        {
          name: '',
          social_links: [
            {
              platform: 'facebook',
              url: '',
            },
          ],
        },
      ],
    }));
  };
  const updateCompetitor = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) =>
        i === index
          ? {
              ...comp,
              [field]: value,
            }
          : comp,
      ),
    }));
  };
  const removeCompetitor = (index) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };
  const addCompetitorLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) =>
        i === index
          ? {
              ...comp,
              social_links: [
                ...(comp.social_links || []),
                {
                  platform: 'facebook',
                  url: '',
                },
              ],
            }
          : comp,
      ),
    }));
  };
  const updateCompetitorLink = (index, linkIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) =>
        i === index
          ? {
              ...comp,
              social_links: (comp.social_links || []).map((link, li) =>
                li === linkIndex
                  ? {
                      ...link,
                      [field]: value,
                    }
                  : link,
              ),
            }
          : comp,
      ),
    }));
  };
  const removeCompetitorLink = (index, linkIndex) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((comp, i) =>
        i === index
          ? {
              ...comp,
              social_links: (comp.social_links || []).filter(
                (_, li) => li !== linkIndex,
              ),
            }
          : comp,
      ),
    }));
  };
  const businessCategoryOptions = (
    lookups.business_categories ||
    BUSINESS_CATEGORIES.map((label) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/gi, '_'),
      label,
    }))
  ).map((item) => ({
    key: item.key,
    label: item.label,
  }));
  const brandToneOptions =
    lookups.brand_tones?.map((item) => ({
      value: item.key,
      label: item.label,
    })) || BRAND_TONES;
  const genderOptions =
    lookups.genders?.map((item) => ({
      value: item.key,
      label: item.label,
    })) || GENDERS;
  const socialPlatformOptions =
    lookups.platforms?.map((item) => ({
      value: item.key,
      label: item.label,
    })) || SOCIAL_PLATFORMS;
  const getCategoryKey = (categoryLabel) =>
    businessCategoryOptions.find((item) => item.label === categoryLabel)?.key;
  const getSubcategoriesForCategory = (category) => {
    const parentKey = getCategoryKey(category);
    if (!parentKey) return [];
    const subcategories = (lookups.business_subcategories || [])
      .filter((item) => item.parent_key === parentKey)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item) => item.label);
    if (subcategories.length > 0) return subcategories;
    const fallback = {
      Electronics: [
        'Consumer Electronics',
        'Computer Stores',
        'Mobile Phones',
        'Audio Equipment',
        'Video Games',
        'Cameras',
        'Drones',
        'Smart Devices',
        'Electronic Repair',
        'Security Systems',
      ],
      Retail: [
        'Department Stores',
        'Specialty Shops',
        'Online Retail',
        'Wholesale',
        'Discount Stores',
        'Convenience Stores',
        'Pharmacies',
        'Bookstores',
        'Pet Stores',
        'Sporting Goods',
      ],
      Services: [
        'Cleaning Services',
        'Maintenance',
        'Repair Services',
        'Installation',
        'Delivery',
        'Courier',
        'Security Services',
        'Waste Management',
        'Recycling',
        'Laundry',
      ],
      'Food & Beverage': [
        'Restaurants',
        'Cafes',
        'Fast Food',
        'Bakeries',
        'Catering',
        'Delivery',
        'Bars & Nightclubs',
        'Food Trucks',
        'Grocery Stores',
        'Specialty Foods',
      ],
      Healthcare: [
        'Hospitals',
        'Clinics',
        'Dentistry',
        'Pharmacy',
        'Fitness',
        'Mental Health',
        'Chiropractic',
        'Physical Therapy',
        'Medical Supplies',
        'Home Health Care',
      ],
      Education: [
        'Schools',
        'Universities',
        'Tutoring',
        'Online Learning',
        'Training',
        'Courses',
        'Daycare',
        'Preschools',
        'Language Schools',
        'Music Schools',
      ],
      'Real Estate': [
        'Residential',
        'Commercial',
        'Property Management',
        'Real Estate Agents',
        'Construction',
        'Mortgage Brokers',
        'Appraisal Services',
        'Property Development',
      ],
      Automotive: [
        'Car Dealerships',
        'Auto Repair',
        'Car Rental',
        'Parts',
        'Motorcycles',
        'Towing',
        'Detailing',
        'Car Wash',
        'Tire Shops',
        'Auto Insurance',
      ],
      Hospitality: [
        'Hotels',
        'Resorts',
        'Travel Agencies',
        'Tourism',
        'Events',
        'Bed & Breakfast',
        'Vacation Rentals',
        'Cruise Lines',
        'Airbnb Hosts',
      ],
      Manufacturing: [
        'Industrial',
        'Consumer Goods',
        'Textiles',
        'Electronics',
        'Food Processing',
        'Chemicals',
        'Machinery',
        'Plastics',
        'Metalworking',
        'Packaging',
      ],
      Technology: [
        'Software',
        'Hardware',
        'IT Services',
        'Startups',
        'Consulting',
        'Web Development',
        'Mobile Apps',
        'Cloud Services',
        'Cybersecurity',
        'Data Analytics',
      ],
      Fashion: [
        'Clothing',
        'Accessories',
        'Shoes',
        'Jewelry',
        'Boutiques',
        'Designer Brands',
        'Vintage Clothing',
        'Sportswear',
        'Lingerie',
        'Costume Design',
      ],
      'Sports & Recreation': [
        'Gyms',
        'Sports Clubs',
        'Outdoor Activities',
        'Fitness',
        'Leisure',
        'Sports Equipment',
        'Adventure Sports',
        'Yoga Studios',
        'Martial Arts',
        'Dance Studios',
      ],
      'Beauty & Wellness': [
        'Salons',
        'Spas',
        'Cosmetics',
        'Wellness Centers',
        'Personal Care',
        'Nail Salons',
        'Barber Shops',
        'Tattoo Parlors',
        'Massage Therapy',
        'Aromatherapy',
      ],
      'Home & Garden': [
        'Home Improvement',
        'Gardening',
        'Furniture',
        'Decor',
        'Tools',
        'Landscaping',
        'Interior Design',
        'Home Staging',
        'Smart Home',
        'Pest Control',
      ],
      'Professional Services': [
        'Accounting',
        'Marketing',
        'Advertising',
        'Consulting',
        'Legal Services',
        'Architecture',
        'Engineering',
        'Photography',
        'Graphic Design',
        'Event Planning',
      ],
      Entertainment: [
        'Movie Theaters',
        'Music Venues',
        'Comedy Clubs',
        'Art Galleries',
        'Museums',
        'Theaters',
        'Concert Halls',
        'Amusement Parks',
        'Arcades',
        'Escape Rooms',
      ],
      Transportation: [
        'Taxi Services',
        'Ride Sharing',
        'Delivery Services',
        'Logistics',
        'Shipping',
        'Moving Services',
        'Bus Services',
        'Rail Services',
        'Airports',
        'Parking',
      ],
      Agriculture: [
        'Farms',
        'Greenhouses',
        'Nurseries',
        'Livestock',
        'Crop Production',
        'Organic Farming',
        'Agricultural Equipment',
        'Seed Suppliers',
        'Farmers Markets',
        'Agricultural Consulting',
      ],
      'Financial Services': [
        'Banks',
        'Credit Unions',
        'Investment Firms',
        'Insurance',
        'Mortgage Lenders',
        'Financial Planning',
        'Tax Services',
        'Payroll Services',
        'Cryptocurrency',
        'Fintech',
      ],
      'Legal Services': [
        'Law Firms',
        'Notary Services',
        'Paralegal Services',
        'Legal Consulting',
        'Mediation Services',
        'Court Reporting',
        'Intellectual Property',
        'Immigration Law',
        'Family Law',
        'Corporate Law',
      ],
      Construction: [
        'General Contractors',
        'Electrical',
        'Plumbing',
        'HVAC',
        'Roofing',
        'Flooring',
        'Painting',
        'Carpentry',
        'Masonry',
        'Demolition',
      ],
      'Media & Communications': [
        'Newspapers',
        'TV Stations',
        'Radio Stations',
        'Podcasting',
        'Social Media',
        'Public Relations',
        'Journalism',
        'Film Production',
        'Advertising Agencies',
        'Publishing',
      ],
      'Non-Profit': [
        'Charities',
        'Foundations',
        'NGOs',
        'Community Organizations',
        'Religious Organizations',
        'Environmental Groups',
        'Animal Welfare',
        'Youth Organizations',
        'Arts & Culture',
        'Education Advocacy',
      ],
      Government: [
        'Municipal Services',
        'State Agencies',
        'Federal Agencies',
        'Public Safety',
        'Utilities',
        'Transportation',
        'Parks & Recreation',
        'Libraries',
        'Courts',
        'Licensing',
      ],
    };
    return fallback[category] || [];
  };
  const handleSave = async () => {
    if (action.locked || resource.denied || action.denied || !resource.data) return;
    const captured = formData;
    action.run(async () => {
      const submitData = new FormData();
      const normalizedData = {
        ...formData,
        competitors: formData.competitors.map((comp) => ({
          ...comp,
          social_links: (comp.social_links || []).reduce((acc, link) => {
            if (link.platform && link.url) acc[link.platform] = link.url;
            return acc;
          }, {}),
        })),
      };
      Object.keys(normalizedData).forEach((key) => {
        if (normalizedData[key] === null || normalizedData[key] === undefined) {
          return;
        }
        if (key === 'profile_image' && formData[key]) {
          submitData.append(key, formData[key]);
        } else if (key === 'product_images' || key === 'competitors') {
          // These uploads/nested writes are not supported by ClientSerializer.
          return;
        } else if (
          Array.isArray(formData[key]) ||
          typeof formData[key] === 'object'
        ) {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });
      const result = parseBusiness((await workspacesAPI.update(clientId, submitData)).data, clientId);
      for (const field of ['name', 'company', 'email', 'phone', 'whatsapp_number', 'website', 'gmb_url', 'business_category', 'brand_description', 'usp', 'brand_tone', 'target_audience', 'gender', 'business_location']) {
        if (result[field] !== captured[field]) throw new Error('Invalid business acknowledgment');
      }
      for (const field of ['business_subcategories', 'target_locations', 'brand_assets']) {
        if (!sameJsonValue(result[field], captured[field])) throw new Error('Invalid business acknowledgment');
      }
      if (captured.profile_image && (!result.profile_image || result.profile_image === resource.data.profile_image)) throw new Error('Invalid photo acknowledgment');
      return result;
    }, async result => { await resource.commit(result); if (action.alive.current) setFormData(previous => ({ ...previous, profile_image: null })); });
  };
  return (
    <div className="app-page app-page--content app-page--lg">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and business profile."
      />

      <div
        className={cn(
          'oauth-hero',
          '[display:grid]',
          '[grid-template-columns:minmax(0,_1.7fr)_minmax(240px,_.8fr)]',
          '[gap:18px]',
          '[margin-bottom:24px]',
          '[padding:22px_24px]',
          '[border-radius:26px]',
          '[background:linear-gradient(135deg,_#ecfeff_0%,_#ffffff_50%,_#eef2ff_100%)]',
          '[border:1px_solid_#c7f3ff]',
          '[box-shadow:0_18px_44px_rgba(15,23,42,.05)]',
        )}
      >
        <div>
          <span
            className={cn(
              '[display:inline-block]',
              '[padding:6px_10px]',
              '[border-radius:999px]',
              '[background:var(--surface-card)]',
              '[color:#0f766e]',
              '[font-size:12px]',
              '[font-weight:800]',
            )}
          >
            Business Profile
          </span>
          <h2
            className={cn(
              '[margin:14px_0_8px]',
              '[font-size:30px]',
              '[line-height:1.1]',
              '[font-weight:900]',
              '[color:var(--text-primary)]',
            )}
          >
            Keep your settings aligned with onboarding
          </h2>
          <p
            className={cn(
              '[margin:0]',
              '[color:var(--text-secondary)]',
              '[font-size:14px]',
              '[line-height:var(--line-height-body)]',
              '[max-width:700px]',
            )}
          >
            Everything here mirrors the information that powers your dashboard,
            content generation, and reporting experience.
          </p>
        </div>
        <div
          className={cn(
            '[padding:18px]',
            '[border-radius:22px]',
            '[background:rgba(255,255,255,.82)]',
            '[border:1px_solid_#dbeafe]',
            '[display:grid]',
            '[gap:8px]',
            '[align-content:start]',
          )}
        >
          <div
            className={cn(
              '[font-size:12px]',
              '[font-weight:700]',
              '[color:var(--text-secondary)]',
              '[text-transform:uppercase]',
              '[letter-spacing:.08em]',
            )}
          >
            Profile coverage
          </div>
          <div
            className={cn(
              '[font-size:30px]',
              '[font-weight:900]',
              '[color:var(--text-primary)]',
            )}
          >
            {
              [
                formData.company,
                formData.business_category,
                formData.target_audience,
                formData.business_location,
              ].filter(Boolean).length
            }
            /4
          </div>
          <div
            className={cn(
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[font-weight:600]',
            )}
          >
            Core profile areas completed
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={cn('[margin-bottom:32px]')}>
        <SegmentedTabs
          items={[
            {
              id: 'accounts',
              label: 'Connect Accounts',
            },
            {
              id: 'profile',
              label: 'Business Profile',
            },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* OAuth result banner */}
      {oauthMsg && (
        <div className="mb-4" role={oauthMsg.type === 'error' ? 'alert' : 'status'}>
          {oauthMsg.type === 'error' ? <DataState compact state="error" title={oauthMsg.text} />
            : <Badge variant="info">{oauthMsg.text}</Badge>}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'accounts' && (
        <ConnectedAccounts
          clientId={clientId}
        />
      )}

      {activeTab === 'profile' && (
        <div><LookupState resource={lookupResource} />
          <h3 ref={heading} tabIndex={-1}>{t('business.title')}</h3>
          <ReadState resource={resource} refresh={() => resource.query.refetch()} busy={saving} returnFocusRef={heading} />
          <WriteState action={action} recover={async () => { const result = await resource.query.refetch(); if (action.alive.current && result.isSuccess) action.verified(); }} />
          {action.success && <p role="status">{t('account.saved')}</p>}
          {profileLoading ? (
            <div
              className={cn(
                '[text-align:center]',
                '[padding:48px]',
                '[background:var(--surface-card)]',
                '[border-radius:22px]',
                '[border:1px_solid_var(--border-default)]',
              )}
            >
              <Loader2
                size={24}
                className={cn(
                  '[animation:spin_1s_linear_infinite]',
                  '[color:var(--brand-primary)]',
                )}
              />
              <div className={cn('[margin-top:16px]', '[color:#6b7280]')}>
                Loading profile...
              </div>
            </div>
          ) : resource.data && !action.denied ? (
            <fieldset disabled={saving} className={cn('[display:grid]', '[gap:24px]', '[border:0]', '[padding:0]', '[min-width:0]')}>
              {/* Business Basics */}
              {renderBusinessBasics({ formData, handleInputChange })}

              {/* Brand Profile */}
              {renderBrandProfile({ formData, handleInputChange, businessCategoryOptions, brandToneOptions, getSubcategoriesForCategory, handleSubcategoryToggle })}

              {/* Audience */}
              {renderAudience({ formData, handleInputChange, genderOptions, handleLocationToggle })}

              {/* Assets */}
              {renderBrandAssets({ handleFileUpload, formData, removeFile, t })}

              {/* Competitors */}
              {renderCompetitors({ t, formData, socialPlatformOptions, addCompetitor, updateCompetitor, removeCompetitor, addCompetitorLink, updateCompetitorLink, removeCompetitorLink })}

              {/* Save Button */}
              <div
                className={cn(
                  '[display:flex]',
                  '[justify-content:space-between]',
                  '[align-items:center]',
                  '[gap:12px]',
                  '[padding-top:24px]',
                  '[border-top:1px_solid_var(--border-default)]',
                  '[flex-wrap:wrap]',
                )}
              >
                <div
                  className={cn(
                    '[display:inline-flex]',
                    '[align-items:center]',
                    '[gap:8px]',
                    '[color:var(--text-secondary)]',
                    '[font-size:13px]',
                    '[font-weight:600]',
                  )}
                >
                  <Sparkles size={16} />
                  Changes here keep your settings aligned with onboarding.
                </div>
                <button
                  onClick={handleSave}
                  disabled={action.locked || resource.query.isFetching}
                  className={cn(
                    '[display:inline-flex]',
                    '[align-items:center]',
                    '[justify-content:center]',
                    '[padding:8px_16px]',
                    '[border:none]',
                    '[border-radius:14px]',
                    '[font-size:15px]',
                    '[font-weight:700]',
                    '[min-height:50px]',
                    '[cursor:pointer]',
                    '[transition:all_0.2s]',
                    '[gap:8px]',
                    '[box-shadow:0_12px_24px_rgba(0,215,255,.18)]',
                    '[-webkit-tap-highlight-color:transparent]',
                    '[background:linear-gradient(135deg,_#00d7ff_0%,_#38bdf8_100%)]',
                    '[color:#021418]',
                    '[font-weight:700]',
                    '[padding:12px_24px]',
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className={cn(
                          '[animation:spin_1s_linear_infinite]',
                          '[margin-inline-end:8px]',
                        )}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save
                        size={16}
                        className={cn('[margin-inline-end:8px]')}
                      />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </fieldset>
          ) : null}
        </div>
      )}
    </div>
  );
}
