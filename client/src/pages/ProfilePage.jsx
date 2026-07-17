const ProfilePage = () => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-xl font-semibold">User Profile</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Name</p>
            <p className="font-semibold">Jane Doe</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Registration Number</p>
            <p className="font-semibold">STU-1024</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Vehicle</p>
            <p className="font-semibold">Toyota Corolla • ABC-1234</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Faculty</p>
            <p className="font-semibold">Computing</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Department</p>
            <p className="font-semibold">Software Engineering</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Phone Number</p>
            <p className="font-semibold">+94 77 123 4567</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
