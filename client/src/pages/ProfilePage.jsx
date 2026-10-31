import { useEffect, useState, useRef } from 'react';
import {
  FaCar,
  FaEdit,
  FaPlus,
  FaSave,
  FaStar,
  FaTrash,
  FaUser,
  FaMotorcycle,
  FaBicycle,
  FaBolt,
  FaCloudUploadAlt,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card3D, Button, Badge, Input, Select, Modal } from '../components';

const blankVehicle = {
  vehicleNumber: '',
  vehicleType: 'car',
  vehicleBrand: '',
  registrationNumber: '',
  model: '',
  color: ''
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getVehicleIcon = (type) => {
  switch (type) {
    case 'motorcycle':
      return <FaMotorcycle className="text-base" />;
    case 'bicycle':
      return <FaBicycle className="text-base" />;
    case 'ev':
      return <FaBolt className="text-base" />;
    case 'car':
    default:
      return <FaCar className="text-base" />;
  }
};

const getStatusBadgeVariant = (vehicle) => {
  if (!vehicle.isActive) return 'default';
  if (vehicle.verificationStatus === 'verified') return 'success';
  if (vehicle.verificationStatus === 'rejected') return 'danger';
  return 'warning';
};

const ProfilePage = () => {
  const { user: sessionUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(sessionUser || {});
  const [vehicles, setVehicles] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const [vehicleImage, setVehicleImage] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);
  const [deletingVehicle, setDeletingVehicle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  const loadProfile = async () => {
    try {
      const [profileRes, vehiclesRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/vehicles')
      ]);
      setProfile(profileRes.data.data || {});
      setVehicles(vehiclesRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Cleanup object URL when image changes or component unmounts
  useEffect(() => {
    if (!vehicleImage) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(vehicleImage);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [vehicleImage]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', profile);
      setProfile(data.data || {});
      updateUser(data.data || {});
      toast.success('Profile updated.');
      setEditingProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed.');
      setImageError('Only JPEG, PNG, and WebP images are allowed.');
      setVehicleImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      setImageError('Image size exceeds 5MB limit.');
      setVehicleImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImageError(null);
    setVehicleImage(file);
  };

  const handleRemoveImage = () => {
    setVehicleImage(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelEditVehicle = () => {
    setEditingVehicleId(null);
    setVehicleForm(blankVehicle);
    setVehicleImage(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    setVehicleSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(vehicleForm).forEach(([field, value]) => payload.append(field, value));
      if (vehicleImage) payload.append('image', vehicleImage);
      if (editingVehicleId) await api.put(`/vehicles/${editingVehicleId}`, payload);
      else await api.post('/vehicles', payload);
      setVehicleForm(blankVehicle);
      setVehicleImage(null);
      setImageError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setEditingVehicleId(null);
      toast.success(editingVehicleId ? 'Vehicle updated and submitted for review.' : 'Vehicle added for verification.');
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add vehicle.');
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const editVehicle = (vehicle) => {
    setEditingVehicleId(vehicle._id);
    setVehicleImage(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setVehicleForm({
      vehicleNumber: vehicle.vehicleNumber || '',
      vehicleType: vehicle.vehicleType || 'car',
      vehicleBrand: vehicle.vehicleBrand || '',
      registrationNumber: vehicle.registrationNumber || '',
      model: vehicle.model || '',
      color: vehicle.color || ''
    });
  };

  const setPrimary = async (vehicle) => {
    setSettingPrimaryId(vehicle._id);
    try {
      await api.put(`/vehicles/${vehicle._id}`, { isPrimary: true });
      toast.success('Primary vehicle updated.');
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update primary vehicle.');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const deleteVehicle = async (id) => {
    if (isDeletingRef.current) return;
    setIsDeleting(true);
    try {
      isDeletingRef.current = true;
      await api.delete(`/vehicles/${id}`);
      toast.success('Vehicle removed.');
      setVehicles((current) => current.filter((vehicle) => vehicle._id !== id));
      setDeletingVehicle(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove vehicle.');
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card3D elevation="md">
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span className="text-sm font-medium">Loading profile...</span>
            </div>
          </div>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium 3D Page Header */}
      <Card3D elevation="md" as="header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* 3D Glowing User Emblem */}
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-cyan-500 p-0.5 shadow-glow-cyan-sm">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0A1020]/80 backdrop-blur-sm">
                <FaUser className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  My profile
                </h1>
                <span className="hidden sm:inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
              </div>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                Keep your campus information up to date.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="md" className="capitalize font-semibold">
              {profile.role || 'student'}
            </Badge>
          </div>
        </div>
      </Card3D>

      {/* Main Content Layout Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] items-start">
        {/* Profile Information Section */}
        <Card3D as="section" aria-labelledby="profile-info-heading" elevation="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-950/40 text-primary-300 shadow-[0_0_12px_-2px_rgba(59,130,246,0.25)]">
                <FaUser className="text-base" />
              </div>
              <div>
                <h2 id="profile-info-heading" className="text-lg font-bold tracking-tight text-text-main">
                  Profile information
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Personal credentials and academic contact info.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingProfile((current) => !current)}
              leftIcon={<FaEdit className="text-xs" />}
              aria-label={editingProfile ? 'Cancel editing profile' : 'Edit profile'}
            >
              {editingProfile ? 'Cancel' : 'Edit profile'}
            </Button>
          </div>

          {editingProfile ? (
            <form onSubmit={saveProfile} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Full name"
                  required
                  placeholder="Full name"
                  value={profile.name || ''}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
                <Input
                  label="Email"
                  required
                  type="email"
                  placeholder="Email"
                  value={profile.email || ''}
                  readOnly
                  className="cursor-not-allowed opacity-70"
                  helperText="Email is bound to your account and cannot be modified."
                />
                <Input
                  label="Role"
                  placeholder="Role"
                  value={profile.role || 'student'}
                  readOnly
                  className="cursor-not-allowed capitalize opacity-70"
                  helperText="Role permissions are managed by administrators."
                />
                <Input
                  label="Registration number"
                  placeholder="Registration number"
                  value={profile.registrationNumber || ''}
                  onChange={(event) => setProfile({ ...profile, registrationNumber: event.target.value })}
                />
                <Input
                  label="Faculty"
                  placeholder="Faculty"
                  value={profile.faculty || ''}
                  onChange={(event) => setProfile({ ...profile, faculty: event.target.value })}
                />
                <Input
                  label="Department"
                  placeholder="Department"
                  value={profile.department || ''}
                  onChange={(event) => setProfile({ ...profile, department: event.target.value })}
                />
                <Input
                  label="Phone number"
                  placeholder="Phone number"
                  value={profile.phoneNumber || ''}
                  onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })}
                  wrapperClassName="md:col-span-2"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProfile(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  loadingText="Saving..."
                  leftIcon={<FaSave />}
                >
                  Save profile
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Name</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.name || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Email</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.email || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Role</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="font-semibold capitalize text-text-main text-sm sm:text-base">{profile.role || 'student'}</p>
                    <Badge variant="cyan" size="sm" className="capitalize">
                      {profile.role || 'student'}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Registration number</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.registrationNumber || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Faculty</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.faculty || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Department</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.department || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-secondary/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/15 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Phone number</p>
                  <p className="mt-1.5 font-semibold text-text-main text-sm sm:text-base break-words">{profile.phoneNumber || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </Card3D>

        {/* My Vehicles Section */}
        <section aria-labelledby="my-vehicles-heading" className="space-y-6">
          <Card3D elevation="md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_-2px_rgba(34,211,238,0.25)]">
                  <FaCar className="text-base" />
                </div>
                <div>
                  <h2 id="my-vehicles-heading" className="text-lg font-bold tracking-tight text-text-main">
                    My vehicles
                  </h2>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Add, edit, and track verification of your registered vehicles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingVehicleId ? (
                  <Badge variant="warning" size="sm" dot className="font-semibold">
                    Editing vehicle
                  </Badge>
                ) : (
                  <Badge variant="cyan" size="sm" className="font-semibold">
                    Registration
                  </Badge>
                )}
              </div>
            </div>

            {/* Verification Reset Warning (Only shown in edit context) */}
            {editingVehicleId && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <FaExclamationTriangle className="text-xs" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold text-amber-300">
                    Verification Notice
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    Changing vehicle details or its image will reset verification status to pending and require admin review.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={addVehicle} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Vehicle number"
                  required
                  placeholder="Vehicle number"
                  value={vehicleForm.vehicleNumber}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, vehicleNumber: event.target.value })
                  }
                  leftIcon={<FaCar className="text-sm" />}
                  helperText="Official campus permit / license plate format"
                />

                <Select
                  label="Vehicle type"
                  required
                  value={vehicleForm.vehicleType}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, vehicleType: event.target.value })
                  }
                  leftIcon={getVehicleIcon(vehicleForm.vehicleType)}
                  options={[
                    { value: 'car', label: 'Car' },
                    { value: 'motorcycle', label: 'Motorcycle' },
                    { value: 'bicycle', label: 'Bicycle' },
                    { value: 'ev', label: 'EV' }
                  ]}
                />

                <Input
                  label="Vehicle brand"
                  placeholder="Vehicle brand"
                  value={vehicleForm.vehicleBrand}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, vehicleBrand: event.target.value })
                  }
                />

                <Input
                  label="Model"
                  placeholder="Model"
                  value={vehicleForm.model}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, model: event.target.value })
                  }
                />

                <Input
                  label="Registration number"
                  placeholder="Registration number"
                  value={vehicleForm.registrationNumber}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, registrationNumber: event.target.value })
                  }
                />

                <Input
                  label="Color"
                  placeholder="Color"
                  value={vehicleForm.color}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, color: event.target.value })
                  }
                />
              </div>

              {/* Image Upload UI */}
              <div className="space-y-2 pt-1">
                <label
                  htmlFor="vehicle-image-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
                >
                  Vehicle image <span className="text-text-muted font-normal normal-case">(optional)</span>
                </label>

                {/* Current Image on File (Edit Mode Only, if vehicle has imageUrl and no new image selected) */}
                {editingVehicleId && !vehicleImage && (() => {
                  const currentEditingVehicle = vehicles.find((v) => v._id === editingVehicleId);
                  return currentEditingVehicle?.imageUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-secondary/50 p-3">
                      <img
                        src={currentEditingVehicle.imageUrl}
                        alt={currentEditingVehicle.vehicleNumber || 'Vehicle photo'}
                        className="h-14 w-14 rounded-lg object-cover border border-white/10 shadow-sm"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-text-main truncate">Current vehicle image</p>
                          <Badge variant="default" size="sm">On file</Badge>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Upload a new image below to replace, or keep existing.
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Upload Container */}
                {vehicleImage && imagePreviewUrl ? (
                  /* Image Preview Card */
                  <div className="relative rounded-2xl border border-cyan-500/30 bg-secondary/70 p-4 shadow-3d-sm transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={imagePreviewUrl}
                          alt="Vehicle preview"
                          className="h-20 w-28 rounded-xl object-cover border border-white/15 shadow-md bg-canvas"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                            {vehicleImage.name}
                          </p>
                          <Badge variant="cyan" size="sm" dot>
                            Ready for upload
                          </Badge>
                        </div>
                        <p className="text-xs text-text-secondary">
                          {formatFileSize(vehicleImage.size)} · JPEG/PNG/WebP verified
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:self-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          leftIcon={<FaCloudUploadAlt className="text-xs" />}
                          aria-label="Change vehicle image"
                        >
                          Change photo
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveImage}
                          leftIcon={<FaTimes className="text-xs" />}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          aria-label="Remove selected vehicle image"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* Hidden Native File Input remains accessible in DOM for Playwright and re-selection */}
                    <input
                      ref={fileInputRef}
                      id="vehicle-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </div>
                ) : (
                  /* Dropzone & File Input */
                  <div className="rounded-2xl border-2 border-dashed border-white/10 bg-secondary/40 p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-secondary/60">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_-2px_rgba(34,211,238,0.25)] mb-2">
                        <FaCloudUploadAlt className="text-xl" />
                      </div>
                      <p className="text-sm font-semibold text-text-main">
                        Upload vehicle photo
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Accepted formats: JPEG, PNG, WebP · Max 5MB
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      id="vehicle-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="mt-2 block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border file:border-cyan-500/30 file:bg-cyan-950/50 file:text-cyan-300 file:font-semibold hover:file:bg-cyan-900/60 file:transition-colors cursor-pointer"
                    />
                  </div>
                )}

                {imageError && (
                  <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 mt-1.5">
                    <FaTimes className="text-[10px]" /> {imageError}
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={vehicleSubmitting}
                  loadingText={editingVehicleId ? 'Updating...' : 'Adding...'}
                  leftIcon={editingVehicleId ? <FaSave /> : <FaPlus />}
                >
                  {editingVehicleId ? 'Update vehicle' : 'Add vehicle'}
                </Button>
                {editingVehicleId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={cancelEditVehicle}
                    disabled={vehicleSubmitting}
                    leftIcon={<FaTimes />}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </Card3D>

          <Card3D elevation="md">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_-2px_rgba(34,211,238,0.25)]">
                  <FaCar className="text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-text-main">
                    Registered vehicles
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Manage and track your campus parking vehicles.
                  </p>
                </div>
              </div>
              <Badge variant="default" size="sm" className="font-semibold text-text-secondary">
                {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
              </Badge>
            </div>

            {vehicles.length ? (
              <div className="space-y-4">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className={`group relative overflow-hidden rounded-xl border p-4 sm:p-5 shadow-3d-sm transition-all duration-200 ${
                      vehicle.isPrimary
                        ? 'border-amber-500/30 bg-gradient-to-b from-[#141F36] to-[#0E1726] shadow-[0_4px_20px_-4px_rgba(245,158,11,0.12)] hover:border-amber-500/50'
                        : 'border-white/10 bg-secondary/70 hover:border-cyan-500/30 hover:bg-card-hover/40 hover:shadow-3d'
                    }`}
                  >
                    {/* Subtle top edge highlight bevel */}
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
                        vehicle.isPrimary ? 'via-amber-400/30' : 'via-white/15'
                      } to-transparent`}
                    />

                    <div className="space-y-4">
                      {/* Card Header: Identity & Status */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                              vehicle.isPrimary
                                ? 'border-amber-500/30 bg-amber-950/40 text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]'
                                : 'border-cyan-500/25 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_-2px_rgba(34,211,238,0.25)]'
                            }`}
                          >
                            {getVehicleIcon(vehicle.vehicleType)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base sm:text-lg font-bold tracking-tight text-white">
                                {vehicle.vehicleNumber}
                              </h4>
                              {vehicle.isPrimary && (
                                <Badge
                                  variant="warning"
                                  size="sm"
                                  className="border-amber-500/40 bg-amber-950/60 font-semibold text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]"
                                >
                                  ★ Primary
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-text-secondary capitalize">
                              {vehicle.vehicleType || 'car'}
                              {vehicle.vehicleBrand ? ` · ${vehicle.vehicleBrand}` : ''}
                              {vehicle.model ? ` ${vehicle.model}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center">
                          <Badge
                            variant={getStatusBadgeVariant(vehicle)}
                            dot
                            size="sm"
                            className="capitalize shrink-0"
                          >
                            <p className="inline m-0 text-xs font-semibold capitalize">
                              {!vehicle.isActive ? 'Inactive' : vehicle.verificationStatus}
                              {vehicle.isActive && vehicle.verificationStatus === 'verified'
                                ? ' · Eligible for reservations'
                                : ''}
                            </p>
                          </Badge>
                        </div>
                      </div>

                      {/* Metadata Grid (only rendered when values exist) */}
                      {(vehicle.registrationNumber || vehicle.color || vehicle.model || vehicle.vehicleBrand) && (
                        <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-white/5 bg-canvas-subtle/50 p-3 sm:grid-cols-4 text-xs">
                          {vehicle.vehicleBrand && (
                            <div>
                              <span className="text-text-muted uppercase tracking-wider font-semibold text-[10px]">Brand</span>
                              <p className="font-semibold text-text-main truncate mt-0.5">{vehicle.vehicleBrand}</p>
                            </div>
                          )}
                          {vehicle.model && (
                            <div>
                              <span className="text-text-muted uppercase tracking-wider font-semibold text-[10px]">Model</span>
                              <p className="font-semibold text-text-main truncate mt-0.5">{vehicle.model}</p>
                            </div>
                          )}
                          {vehicle.registrationNumber && (
                            <div>
                              <span className="text-text-muted uppercase tracking-wider font-semibold text-[10px]">Registration</span>
                              <p className="font-semibold text-text-main truncate mt-0.5">{vehicle.registrationNumber}</p>
                            </div>
                          )}
                          {vehicle.color && (
                            <div>
                              <span className="text-text-muted uppercase tracking-wider font-semibold text-[10px]">Colour</span>
                              <p className="font-semibold text-text-main truncate mt-0.5 capitalize">{vehicle.color}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Notice */}
                      {vehicle.verificationStatus === 'rejected' && vehicle.rejectionReason && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <p className="font-medium">
                            <span className="font-bold text-rose-300">Reason: </span>
                            {vehicle.rejectionReason}
                          </p>
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-3">
                        {!vehicle.isPrimary && (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={settingPrimaryId === vehicle._id}
                            loadingText="Setting..."
                            disabled={settingPrimaryId !== null || isDeleting}
                            onClick={() => setPrimary(vehicle)}
                            leftIcon={<FaStar className="text-xs text-amber-300" />}
                            title="Set primary"
                            aria-label={`Set ${vehicle.vehicleNumber} as primary vehicle`}
                          >
                            Set primary
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => editVehicle(vehicle)}
                          disabled={isDeleting || settingPrimaryId !== null}
                          leftIcon={<FaEdit className="text-xs text-cyan-300" />}
                          title="Edit vehicle"
                          aria-label={`Edit vehicle ${vehicle.vehicleNumber}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingVehicle(vehicle)}
                          disabled={isDeleting || settingPrimaryId !== null}
                          leftIcon={<FaTrash className="text-xs" />}
                          title="Delete vehicle"
                          aria-label={`Delete vehicle ${vehicle.vehicleNumber}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-canvas-subtle/40 px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-secondary/80 text-text-muted shadow-inner-depth">
                  <FaCar className="text-xl text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-secondary">
                  No vehicles registered yet.
                </p>
                <p className="mt-1 text-xs text-text-muted max-w-sm">
                  Register your vehicle using the form above to submit for campus verification.
                </p>
              </div>
            )}
          </Card3D>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingVehicle)}
        onClose={() => {
          if (!isDeleting) setDeletingVehicle(null);
        }}
        closeOnOverlayClick={!isDeleting}
        closeOnEscape={!isDeleting}
        title="Delete vehicle"
        description="This action cannot be undone."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeletingVehicle(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeleting}
              loadingText="Deleting..."
              onClick={() => deletingVehicle && deleteVehicle(deletingVehicle._id)}
              leftIcon={<FaTrash className="text-xs" />}
            >
              Delete vehicle
            </Button>
          </>
        }
      >
        {deletingVehicle && (
          <div className="space-y-4 text-sm">
            <p className="text-text-secondary leading-relaxed">
              Are you sure you want to delete vehicle{' '}
              <span className="font-bold text-white font-mono px-1.5 py-0.5 rounded-md bg-secondary border border-white/10">
                {deletingVehicle.vehicleNumber}
              </span>
              ?
            </p>
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 text-xs text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="font-semibold text-rose-200">Warning: Deletion is permanent</p>
              <p className="mt-1 text-rose-300/80 leading-relaxed">
                Deleting this vehicle permanently removes its registration and verification information. Existing or pending reservations linked to this vehicle are not automatically cancelled by this action.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProfilePage;
