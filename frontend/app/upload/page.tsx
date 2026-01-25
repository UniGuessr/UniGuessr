"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Link } from "@heroui/link";
import { motion } from "framer-motion";
import { uploadLocation } from "@/lib/api";
import LocationPickerMap from "@/components/location-picker-map";

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        return;
      }

      setImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("Please enter a location name");
      return false;
    }

    if (!coordinates) {
      setError("Please select a location on the map");
      return false;
    }

    if (!image) {
      setError("Please select an image");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await uploadLocation({
        name: name.trim(),
        latitude: coordinates!.lat,
        longitude: coordinates!.lng,
        difficulty,
        image: image!,
      });

      setSuccess(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload location");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCoordinates(null);
    setDifficulty("medium");
    setImage(null);
    setImagePreview(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">📍 Upload Location</h1>
              <p className="text-slate-600">
                Share a location from Concordia University
              </p>
            </div>
            <Button
              as={Link}
              href="/"
              variant="bordered"
              size="lg"
            >
              Home
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-emerald-50 border-2 border-emerald-200">
              <CardBody>
                <div className="text-center py-4">
                  <p className="text-5xl mb-3">✅</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    Location uploaded successfully!
                  </p>
                  <p className="text-sm text-emerald-600 mt-2">
                    Thank you for contributing to ConUGuessr
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Upload Form */}
        {!success && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <h2 className="text-xl font-semibold">Location Details</h2>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Name */}
                <Input
                  label="Location Name"
                  placeholder="e.g., Engineering Building Entrance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  isRequired
                  description="Give this location a descriptive name"
                  size="lg"
                />

                {/* Map Location Picker */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Location on Map *
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Click on the map to select the exact location. You can drag the marker to adjust.
                  </p>
                  <LocationPickerMap
                    onLocationSelect={handleLocationSelect}
                    initialLat={coordinates?.lat}
                    initialLng={coordinates?.lng}
                  />
                </div>

                {/* Difficulty */}
                <Select
                  label="Difficulty"
                  placeholder="Select difficulty level"
                  selectedKeys={[difficulty]}
                  onChange={(e) => setDifficulty(e.target.value)}
                  description="How challenging is it to identify this location?"
                  size="lg"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <SelectItem key={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Location Image *
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-lg border-2 border-slate-200"
                      />
                      <Button
                        color="danger"
                        size="sm"
                        className="absolute top-2 right-2"
                        onPress={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <div className="text-5xl">📷</div>
                        <p className="text-slate-600 font-medium">
                          Click to upload an image
                        </p>
                        <p className="text-sm text-slate-400">
                          PNG, JPG, WEBP up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Use the zoom controls to navigate the map. 
                    The marker is draggable, so you can fine-tune the position after placing it.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    className="flex-1 font-semibold"
                    isLoading={loading}
                    isDisabled={loading}
                  >
                    Upload Location
                  </Button>
                  <Button
                    type="button"
                    variant="bordered"
                    size="lg"
                    onPress={resetForm}
                    isDisabled={loading}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
