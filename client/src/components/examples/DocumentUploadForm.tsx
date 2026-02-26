import DocumentUploadForm from "../DocumentUploadForm";

export default function DocumentUploadFormExample() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <DocumentUploadForm onSubmit={(data) => console.log("Document submitted:", data)} />
    </div>
  );
}
