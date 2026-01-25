"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { uploadLocation } from "@/lib/api";
import LocationPickerMap from "@/components/location-picker-map";
import FloorSelector from "@/components/floor-selector";
import { PixelButton } from "@/components/pixel-button";
import { findNearbyBuilding, type Building } from "@/config/buildings";
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
  const [nearbyBuilding, setNearbyBuilding] = useState<Building | null>(null);
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setError(null);
    
    // Check if pin is near a building with floors - show selector immediately
    const building = findNearbyBuilding(lat, lng);
    if (building) {
      setNearbyBuilding(building);
      setBuildingId(building.id);
      setShowFloorSelector(true);
    } else {
      // Clear floor selection if moving away from building
      setNearbyBuilding(null);
      setBuildingId(null);
      setShowFloorSelector(false);
      setFloor(null);
    }
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

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    // Reset file input so same file can be selected again
    const fileInput = document.getElementById("image-upload-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const resetForm = () => {
    setName("");
    setCoordinates(null);
    setDifficulty("medium");
    setBuildingId(null);
    setFloor(null);
    setNearbyBuilding(null);
    setShowFloorSelector(false);
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
                <div className="mt-6">
                  <Link href="/">
                    <PixelButton variant="secondary" size="md">
                      Back to Home
                    </PixelButton>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col h-full gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Add New Location</h1>
                  <p className="text-slate-500 text-sm mt-1">Help others explore Concordia's campus.</p>
                </div>
                <Link href="/">
                  <PixelButton variant="secondary" size="sm" className="flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Back
                  </PixelButton>
                </Link>
              </div>

              <div className="grid lg:grid-cols-5 gap-8 flex-1 min-h-0">
              
              {/* Left Column: Form (2/5) */}
              <div className="lg:col-span-2 space-y-5 overflow-y-auto pr-2 custom-scrollbar">

                <form onSubmit={handleSubmit} id="location-form" className="space-y-5">
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

                  <div className="space-y-2">
                    <div className="text-sm font-medium px-1">Location Image</div>
                    {imagePreview ? (
                      <div className="group relative rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img src={imagePreview} alt="Preview" className="w-full h-[300px] object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            isIconOnly 
                            color="danger" 
                            variant="flat" 
                            onPress={handleRemoveImage}
                            className="pointer-events-auto"
                          >
                            <Trash2 size={20} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label 
                        htmlFor="image-upload-input"
                        className="flex flex-col items-center justify-center w-full h-[300px] border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all group relative"
                      >
                        <input 
                          id="image-upload-input"
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          accept="image/*" 
                          onChange={handleImageChange}
                        />
                        <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors pointer-events-none" size={32} />
                        <span className="text-sm text-slate-500 font-medium pointer-events-none">Click to upload photo</span>
                        <span className="text-xs text-slate-400 mt-1 pointer-events-none">PNG, JPG, WEBP up to 10MB</span>
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
                <div className="lg:col-span-3 min-h-[400px] relative">
                  <Card className="h-full border-none">
                    <div className="relative w-full h-full">
                      <LocationPickerMap
                        onLocationSelect={handleLocationSelect}
                        initialLat={coordinates?.lat}
                        initialLng={coordinates?.lng}
                      />
                      {/* Floor selector positioned over map */}
                      {showFloorSelector && nearbyBuilding && (
                        <div className="absolute top-4 right-4 z-50">
                          <FloorSelector
                            building={nearbyBuilding}
                            selectedFloor={floor}
                            onFloorSelect={setFloor}
                            size="large"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
  );
}