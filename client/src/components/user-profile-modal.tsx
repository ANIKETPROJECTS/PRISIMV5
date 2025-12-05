import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { User, Mail, Phone, Building2, Shield, Lock, Save, X, Edit, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";

const profileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  mobile: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current PIN is required"),
  newPassword: z.string().min(4, "PIN must be at least 4 characters"),
  confirmPassword: z.string().min(1, "Confirm PIN is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "PINs don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewMode = "view" | "edit" | "password";

export function UserProfileModal({ open, onOpenChange }: UserProfileModalProps) {
  const { user, company } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("view");

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  interface UserProfile {
    fullName?: string;
    email?: string;
    mobile?: string;
    lastLogin?: string;
  }

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/users", user?.id, "profile"],
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        fullName: userProfile.fullName || "",
        email: userProfile.email || "",
        mobile: userProfile.mobile || "",
      });
    }
  }, [userProfile, profileForm]);

  useEffect(() => {
    if (!open) {
      setViewMode("view");
      passwordForm.reset();
    }
  }, [open, passwordForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}/profile`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "profile"] });
      profileForm.reset({
        fullName: data.fullName || "",
        email: data.email || "",
        mobile: data.mobile || "",
      });
      toast({ title: "Profile updated successfully" });
      setViewMode("view");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      return apiRequest("PATCH", `/api/users/${user?.id}/password`, {
        currentPin: data.currentPassword,
        newPin: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({ title: "Security PIN updated successfully" });
      passwordForm.reset();
      setViewMode("view");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating Security PIN",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    updatePasswordMutation.mutate(data);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "gst":
        return <Badge variant="secondary">GST</Badge>;
      case "non_gst":
        return <Badge variant="outline">Non-GST</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-600">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setViewMode("view");
  };

  const renderViewMode = () => (
    <>
      <div className="flex items-center gap-4 py-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
            {user?.username?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold">{user?.username}</h3>
            {user?.role && getRoleBadge(user.role)}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{company?.name || "No company"}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Username</label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username || "-"}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Full Name</label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userProfile?.fullName || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Role</label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">{user?.role || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Company</label>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{company?.name || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Mobile Number</label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userProfile?.mobile || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userProfile?.email || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">User Status</label>
            <div className="flex items-center gap-2">
              {getStatusBadge(user?.isActive ?? true)}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last Login</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userProfile?.lastLogin || "Current session"}</span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          data-testid="button-close-profile"
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
        <Button
          type="button"
          onClick={() => setViewMode("edit")}
          data-testid="button-edit-profile"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogFooter>
    </>
  );

  const renderEditMode = () => (
    <>
      <div className="flex items-center gap-4 py-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl font-medium bg-primary/10 text-primary">
            {user?.username?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{user?.username}</h3>
            {user?.role && getRoleBadge(user.role)}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{company?.name || "No company"}</span>
          </div>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="profile" className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="tab-password">
            <Lock className="h-4 w-4 mr-2" />
            Security PIN
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Enter your full name" 
                          className="pl-10" 
                          data-testid="input-fullname"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email"
                          placeholder="Enter your email" 
                          className="pl-10" 
                          data-testid="input-email"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Enter your mobile number" 
                          className="pl-10" 
                          data-testid="input-mobile"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Role: {user?.role}</span>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewMode("view")}
                  data-testid="button-cancel-profile"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current PIN</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter current PIN" 
                        data-testid="input-current-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New PIN</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter new PIN" 
                        data-testid="input-new-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New PIN</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Confirm new PIN" 
                        data-testid="input-confirm-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewMode("view")}
                  data-testid="button-cancel-password"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  data-testid="button-update-password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {updatePasswordMutation.isPending ? "Updating..." : "Update PIN"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {viewMode === "view" ? "User Profile" : "Edit Profile"}
          </DialogTitle>
          <DialogDescription>
            {viewMode === "view" 
              ? "View your profile information" 
              : "Update your profile information and security settings"
            }
          </DialogDescription>
        </DialogHeader>

        {viewMode === "view" ? renderViewMode() : renderEditMode()}
      </DialogContent>
    </Dialog>
  );
}
