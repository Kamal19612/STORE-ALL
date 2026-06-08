import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de repli.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Vous pouvez aussi enregistrer l'erreur dans un service de rapport d'erreurs
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Vous pouvez afficher n'importe quelle UI de repli
      return (
        <div className="p-10 bg-red-50 text-red-900 border border-red-200 rounded-lg max-w-4xl mx-auto mt-10">
          <h1 className="text-2xl font-bold mb-4">Something went wrong. 😢</h1>
          <div className="mb-4">
            <h2 className="font-bold">Error:</h2>
            <pre className="text-sm bg-red-100 p-2 rounded overflow-auto">
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          <div>
            <h2 className="font-bold">Stack Trace:</h2>
            <pre className="text-xs bg-red-100 p-2 rounded overflow-auto h-64">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
