import { useState, useEffect } from "react";
import api from "../../services/api";
import { getManagerApiPrefix } from "../../services/managerApiContext";

/**
 * Composant de diagnostic pour tester l'endpoint des commandes
 */
const OrdersDiagnostic = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("🔍 Testing /api/manager/{storeId}/orders endpoint...");

      // Vérifier le token
      const token = localStorage.getItem("token");
      console.log("🔑 Token présent:", !!token);
      console.log("🔑 Token (premiers 50 chars):", token?.substring(0, 50));

      // Appeler l'API
      const response = await api.get(`${getManagerApiPrefix()}/orders?page=0&size=10`);

      console.log("✅ SUCCESS - Réponse complète:", response);
      console.log("✅ Data:", response.data);
      console.log("✅ Content:", response.data.content);
      console.log("✅ Nombre de commandes:", response.data.content?.length);

      setResult({
        success: true,
        data: response.data,
        ordersCount: response.data.content?.length || 0,
        totalElements: response.data.totalElements,
      });
    } catch (error) {
      console.error("❌ ERROR:", error);
      console.error("❌ Response:", error.response);
      console.error("❌ Status:", error.response?.status);
      console.error("❌ Data:", error.response?.data);

      setResult({
        success: false,
        error: error.message,
        status: error.response?.status,
        details: error.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testEndpoint();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          🔍 Diagnostic Orders Endpoint
        </h1>

        <button
          onClick={testEndpoint}
          disabled={loading}
          className="mb-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Test en cours..." : "Relancer le test"}
        </button>

        {result && (
          <div
            className={`p-6 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
          >
            <h2 className="text-xl font-bold mb-4">
              {result.success ? "✅ SUCCÈS" : "❌ ERREUR"}
            </h2>

            {result.success ? (
              <div className="space-y-4">
                <div>
                  <strong>Nombre de commandes trouvées:</strong>{" "}
                  {result.ordersCount}
                </div>
                <div>
                  <strong>Total éléments:</strong> {result.totalElements}
                </div>
                <div>
                  <strong>Données complètes:</strong>
                  <pre className="mt-2 p-4 bg-white rounded border overflow-auto max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <strong>Message d'erreur:</strong> {result.error}
                </div>
                <div>
                  <strong>Status HTTP:</strong> {result.status}
                </div>
                <div>
                  <strong>Détails:</strong>
                  <pre className="mt-2 p-4 bg-white rounded border overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="font-bold mb-4">📋 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Ouvrez la console développeur (F12)</li>
            <li>Cliquez sur "Relancer le test"</li>
            <li>
              Vérifiez les logs dans la console et les résultats ci-dessus
            </li>
            <li>Si erreur 401/403: problème d'authentification</li>
            <li>
              Si ordersCount = 0: les commandes existent mais ne sont pas
              retournées
            </li>
            <li>Si ordersCount &gt; 0: tout fonctionne !</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default OrdersDiagnostic;
