import { Component } from "react";

/**
 * Isole les erreurs de la modale PDF pour éviter un écran blanc sur toute la vitrine.
 */
export default class ProductPdfFormErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Erreur lors du chargement du formulaire PDF.",
    };
  }

  componentDidCatch(error, info) {
    console.error("[ProductPdfFormModal]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback?.(this.state.message) ?? null;
    }
    return this.props.children;
  }
}
