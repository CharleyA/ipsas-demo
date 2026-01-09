"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Save, Loader2, Globe, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganisationSchema, UpdateOrganisationInput } from "@/lib/validations/schemas";
import { useAuth } from "@/components/providers/auth-provider";

export default function OrganisationProfilePage() {
    const { token, user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [organisation, setOrganisation] = useState<any>(null);
    const [currencies, setCurrencies] = useState<any[]>([]);

    const form = useForm<UpdateOrganisationInput>({
      resolver: zodResolver(updateOrganisationSchema),
      defaultValues: {
        name: "",
        baseCurrency: "ZWG",
        address: "",
        phone: "",
        email: "",
      },
    });

    useEffect(() => {
      async function fetchData() {
        if (!user?.organisationId || !token) return;

        try {
          const [orgRes, currRes] = await Promise.all([
            fetch(`/api/organisations/${user.organisationId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/currencies?activeOnly=true", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const orgResult = await orgRes.json();
          const currResult = await currRes.json();

          if (orgResult.success) {
            setOrganisation(orgResult.data);
            form.reset({
              name: orgResult.data.name,
              baseCurrency: orgResult.data.baseCurrency,
              address: orgResult.data.address || "",
              phone: orgResult.data.phone || "",
              email: orgResult.data.email || "",
            });
          }

          if (Array.isArray(currResult.data)) {
            setCurrencies(currResult.data);
          } else if (Array.isArray(currResult)) {
            setCurrencies(currResult);
          }
        } catch (error) {
          toast.error("An error occurred while fetching data");
        } finally {
          setIsLoading(false);
        }
      }

      fetchData();
    }, [user?.organisationId, form, token]);

    async function onSubmit(data: UpdateOrganisationInput) {
      if (!user?.organisationId || !token) return;

      setIsSaving(true);
      try {
        const response = await fetch(`/api/organisations/${user.organisationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

      const result = await response.json();

      if (result.success) {
        toast.success("Organisation profile updated successfully");
        setOrganisation(result.data);
      } else {
        toast.error(result.error || "Failed to update organisation profile");
      }
    } catch (error) {
      toast.error("An error occurred while saving organisation profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organisation Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your school or organisation&apos;s basic information.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                General details about your institution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organisation name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baseCurrency"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select base currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map((curr) => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.name} ({curr.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The primary currency used for reporting.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>

                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Official Email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="email@organisation.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+263..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Physical Address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="123 Education Way, Harare" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
