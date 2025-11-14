import { useState } from 'react';
import { Box, Button, Container, Heading, Input, VStack, Text, useToast, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const toast = useToast();

  const handleIngest = async () => {
    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter the admin password',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLastResult('success');
        toast({
          title: 'Ingestion Started!',
          description: data.message,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });
      } else {
        setLastResult('error');
        toast({
          title: 'Error',
          description: data.message || 'Failed to start ingestion',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      setLastResult('error');
      toast({
        title: 'Network Error',
        description: 'Failed to connect to the server',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={12}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={2}>Admin Panel</Heading>
          <Text color="gray.600">Product Catalog Management</Text>
        </Box>

        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Important: Hosting Limitation</AlertTitle>
            <AlertDescription>
              If hosted on Vercel/Netlify, this button won't work for the full 30-45 minute process.
              <br /><br />
              <strong>Recommended:</strong> Use GitHub Actions instead:
              <br />
              1. Go to your GitHub repository
              <br />
              2. Click "Actions" tab
              <br />
              3. Select "Product Ingestion"
              <br />
              4. Click "Run workflow"
            </AlertDescription>
          </Box>
        </Alert>
        
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>What This Does</AlertTitle>
            <AlertDescription>
              Updates the product catalog by fetching the latest items from Spring.
              Takes 30-45 minutes to complete.
            </AlertDescription>
          </Box>
        </Alert>

        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <VStack spacing={4}>
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="lg"
              onKeyPress={(e) => e.key === 'Enter' && handleIngest()}
            />

            <Button
              colorScheme="blue"
              size="lg"
              width="full"
              onClick={handleIngest}
              isLoading={isLoading}
              loadingText="Starting..."
            >
              Update Product Catalog
            </Button>
          </VStack>
        </Box>

        {lastResult === 'success' && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Process Started</AlertTitle>
              <AlertDescription>
                The catalog update is running in the background. Check back in 30-45 minutes to see new products!
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <Box fontSize="sm" color="gray.500" textAlign="center">
          <Text>Need help? Contact the developer.</Text>
        </Box>
      </VStack>
    </Container>
  );
}
