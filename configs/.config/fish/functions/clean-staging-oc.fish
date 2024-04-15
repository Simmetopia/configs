function clean-staging-oc
  # Check if the kubectl context exists
  if kubectl config get-contexts | grep -q 'aco-t-eu'
    # Context exists, proceed with deleting namespaces
    echo "Context aco-t-eu is available. Proceeding with deletion..."
    kubectl get namespaces --context=aco-t-eu -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep 'pr-' | xargs -I {} kubectl delete namespace {} --context=aco-t-eu
  else
    # Context does not exist, print error message
    echo "Error: Context aco-t-eu is not available. Please check your Kubernetes contexts."
  end
end
