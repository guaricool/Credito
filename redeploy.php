$application = App\Models\Application::find(8);
$deployment_uuid = (string) Illuminate\Support\Str::uuid();
queue_application_deployment(
    application: $application,
    deployment_uuid: $deployment_uuid,
    commit: 'HEAD',
    force_rebuild: true,
    no_questions_asked: true
);
echo "REDEPLOY_QUEUED: " . $deployment_uuid;
