import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import ImageComponent from '../componentGeneral/ImageComponent.jsx';
import useAuthAdminStore from '../../store/AuthAdminStore.js';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const apiUrl = import.meta.env.VITE_API_URL;

const FeatureImageAdmin = () => {
  const [featureImages, setFeatureImages] = useState([]);
  const [editingFeature, setEditingFeature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const { register, handleSubmit, reset, setValue, control } = useForm();
  const fileInputRef = useRef(null);
  const { token } = useAuthAdminStore();

  useEffect(() => {
    const fetchFeatureImages = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/feature-images`);
        setFeatureImages(data.data);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };
    fetchFeatureImages();
  }, []);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('title', data.title);

    if (data.imgSrc && data.imgSrc.length > 0) {
      formData.append('imgSrc', data.imgSrc[0]);
    }

    setSubmitting(true);
    try {
      if (editingFeature) {
        await axios.put(
          `${apiUrl}/feature-images/${editingFeature._id}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        toast.success('Feature image updated successfully!');
      } else {
        await axios.post(`${apiUrl}/feature-images/create`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success('Feature image added successfully!');
      }

      const { data: refreshData } = await axios.get(`${apiUrl}/feature-images`);
      setFeatureImages(refreshData.data);

      setEditingFeature(null);
      setPreview(null);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setPreview(null);
    setValue('title', feature.title);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiUrl}/feature-images/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeatureImages(featureImages.filter((item) => item._id !== id));
      toast.success('Feature image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingFeature(null);
    setPreview(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h1 className="border-l-4 primaryBorderColor primaryTextColor mb-6 pl-2 text-lg font-semibold">
            Feature Images
          </h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 max-w-md"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register('title', { required: true })}
                placeholder="Enter feature title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imgSrc">Image</Label>
              <Controller
                name="imgSrc"
                control={control}
                defaultValue={null}
                render={({ field }) => (
                  <Input
                    id="imgSrc"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      field.onChange(e.target.files);
                      if (e.target.files?.[0]) {
                        setPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                )}
              />
              {(preview || editingFeature) && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {preview ? 'New image preview:' : 'Current image:'}
                  </p>
                  {preview ? (
                    <img src={preview} alt="Preview" className=" " />
                  ) : (
                    <ImageComponent imageName={editingFeature.imgSrc} />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editingFeature ? 'Update Image' : 'Add Image'}
              </Button>
              {editingFeature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {featureImages.map((feature) => (
          <Card key={feature._id} className="relative overflow-hidden">
            <CardContent className="p-0">
              <ImageComponent
                imageName={feature.imgSrc}
                className="w-full h-60 object-contain"
                skeletonHeight={200}
              />
              <div className="p-4">
                <h3 className="text-center font-semibold">{feature.title}</h3>
              </div>
            </CardContent>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => handleEdit(feature)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => setDeleteTarget(feature._id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature image? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureImageAdmin;
