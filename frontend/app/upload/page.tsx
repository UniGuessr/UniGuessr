"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import { uploadLocation } from "@/lib/api";
import LocationPickerMap from "@/components/location-picker-map";
<<<<<<< Updated upstream
import { PixelButton } from "@/components/pixel-button";
=======
import { findNearbyBuilding, BUILDINGS_WITH_FLOORS, getBuildingById } from "@/config/buildings";
>>>>>>> Stashed changes
import { ArrowLeft, Upload, Trash2, CheckCircle2, MapPin } from "lucide-react"; // Optional: recommended for a sleek look

const DIFFICULTY_OPTIONS = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

export default function UploadLocationPage() {
  const [name, setName] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Building and floor state
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [nearbyBuilding, setNearbyBuilding] = useState<ReturnType<typeof findNearbyBuilding>>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-detect nearby building when coordinates change
  useEffect(() => {
    if (coordinates) {
      const building = findNearbyBuilding(coordinates.lat, coordinates.lng);
      setNearbyBuilding(building);
      
      // Auto-select building if nearby
      if (building) {
        setBuildingId(building.id);
      } else {
        setBuildingId(null);
        setFloor(null);
      }
    }
  }, [coordinates]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Invalid image file");
        return;
      }
      setImage(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setName("");
    setCoordinates(null);
    setDifficulty("medium");
    setBuildingId(null);
    setFloor(null);
    setNearbyBuilding(null);
    setImage(null);
    setImagePreview(null);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coordinates || !image) {
      setError("Please complete all fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await uploadLocation({
        name: name.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        difficulty,
        building_id: buildingId,
        floor: floor,
        image: image!,
      });
      setSuccess(true);
      setTimeout(resetForm, 3000);
    } catch (err) {
      setError("Failed to upload. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <main className="mx-auto p-4 lg:p-8 h-[calc(100vh-2rem)]">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-bold">Location Uploaded!</h2>
                <p className="text-slate-500">Your contribution is now live in the pool.</p>
              </div>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-8 h-full">
              
              {/* Left Column: Form (2/5) */}
              <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Add New Location</h1>
                  <p className="text-slate-500 text-sm mt-1">Help others explore Concordia’s campus.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Name"
                    variant="bordered"
                    placeholder="e.g. Hall Building Mezzanine"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    classNames={{ label: "font-medium"}}
                  />

                  <Select
                    label="Difficulty"
                    variant="bordered"
                    selectedKeys={[difficulty]}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </Select>

                  {/* Building selection */}
                  {nearbyBuilding && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200 space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-2xl">🏢</div>
                        <div className="flex-1">
                          <p className="font-semibold text-purple-900 text-sm">
                            {nearbyBuilding.name} Detected!
                          </p>
                          <p className="text-xs text-purple-700 mt-0.5">
                            This location can earn floor bonus points
                          </p>
                        </div>
                      </div>

                      <Select
                        label="Building (Optional)"
                        variant="bordered"
                        placeholder="Select a building"
                        selectedKeys={buildingId ? [buildingId] : []}
                        onChange={(e) => {
                          setBuildingId(e.target.value || null);
                          setFloor(null);
                        }}
                        classNames={{ trigger: "bg-white" }}
                      >
                        {BUILDINGS_WITH_FLOORS.map((building) => (
                          <SelectItem key={building.id}>{building.name}</SelectItem>
                        ))}
                      </Select>

                      {buildingId && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <label className="text-sm font-medium text-purple-900 mb-2 block">
                            Floor Number (Optional)
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {getBuildingById(buildingId)?.floors.map((floorNum) => (
                              <button
                                key={floorNum}
                                type="button"
                                onClick={() => setFloor(floorNum === floor ? null : floorNum)}
                                className={`
                                  aspect-square rounded-lg font-bold text-sm transition-all
                                  ${
                                    floor === floorNum
                                      ? "bg-purple-600 text-white shadow-lg scale-105"
                                      : "bg-white text-slate-700 hover:bg-purple-100 border border-purple-200"
                                  }
                                `}
                              >
                                {floorNum}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-purple-600 mt-2">
                            💡 Correct floor guesses earn +20% bonus points!
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium px-1">Location Image</label>
                    {imagePreview ? (
                      <div className="group relative rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm ">
                        <img src={imagePreview} alt="Preview" className="w-full h-[440px] object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button isIconOnly color="danger" variant="flat" onPress={() => {setImage(null); setImagePreview(null)}}>
                            <Trash2 size={20} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-[445px] border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                        <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                        <span className="text-sm text-slate-500 font-medium">Click to upload photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <PixelButton 
                      type="submit" 
                      size="lg" 
                      className="flex-1 h-[40px]"
                      isLoading={loading}
                      variant="secondary"
                    >
                      Publish Location
                    </PixelButton>
                  </div>
                </form>
              </div>

              {/* Right Column: Map (3/5) */}
              <div className="lg:col-span-3 min-h-[600px] lg:h-full relative">
                <Card className="h-full border-none">
                  <LocationPickerMap
                    onLocationSelect={handleLocationSelect}
                    initialLat={coordinates?.lat}
                    initialLng={coordinates?.lng}

                  />
                </Card>
              </div>

            </div>
          )}
        </AnimatePresence>
      </main>
  );
}