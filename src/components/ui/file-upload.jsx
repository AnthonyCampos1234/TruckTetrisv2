import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { itemMaster } from '@/data/itemMaster';

export function FileUpload({ onFileAccepted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const processCSV = async (file) => {
    const text = await file.text();
    const lines = text.split('\n');
    
    // Find the header line (it contains Item, Qty_Ord)
    const headerLineIndex = lines.findIndex(line => 
      line.includes('Item') && line.includes('Qty_Ord')
    );
    
    if (headerLineIndex === -1) {
      throw new Error('Invalid CSV format: Missing required headers (Item and Qty_Ord)');
    }

    // Get the header line and find column indexes
    const headers = lines[headerLineIndex].split(',');
    const itemIndex = headers.findIndex(h => h.trim() === 'Item');
    const qtyIndex = headers.findIndex(h => h.trim() === 'Qty_Ord');
    const uomIndex = headers.findIndex(h => h.trim() === 'UOM');

    if (itemIndex === -1 || qtyIndex === -1 || uomIndex === -1) {
      throw new Error('Required columns not found in CSV (Item, Qty_Ord, UOM)');
    }

    const orderItems = [];
    const unknownItems = [];

    // Process order lines
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map(val => val.trim());
      const itemId = columns[itemIndex];
      const qtyOrdered = columns[qtyIndex];
      const uom = columns[uomIndex];
      
      // Skip if no item ID or quantity or if they're empty
      if (!itemId || !qtyOrdered || 
          itemId === '' || qtyOrdered === '' || 
          isNaN(parseFloat(qtyOrdered))) {
        continue;
      }

      let qty = parseFloat(qtyOrdered);
      
      // Handle case/roll conversions if needed
      if (uom === 'CS' || uom === 'RL') {
        // For items in cases/rolls, we need to check if there's a conversion in itemMaster
        if (itemMaster[itemId] && itemMaster[itemId].qtyPerCase) {
          qty = qty * itemMaster[itemId].qtyPerCase;
        }
      }
      
      // Skip items with 0 quantity
      if (qty <= 0) continue;
      
      if (itemMaster[itemId]) {
        const palletsNeeded = Math.ceil(qty / itemMaster[itemId].qtyPerPallet);
        orderItems.push({
          itemId,
          quantity: qty,
          originalQty: parseFloat(qtyOrdered),
          uom,
          description: itemMaster[itemId].description,
          palletsNeeded,
          dimensions: itemMaster[itemId].dimensions,
          qtyPerPallet: itemMaster[itemId].qtyPerPallet
        });
      } else {
        unknownItems.push({
          itemId,
          quantity: qty,
          originalQty: parseFloat(qtyOrdered),
          uom
        });
      }
    }

    // If no valid items were found, throw an error
    if (orderItems.length === 0 && unknownItems.length === 0) {
      throw new Error('No valid order items found in the CSV file');
    }

    // Calculate total pallets and organize data
    const totalPallets = orderItems.reduce((sum, item) => sum + item.palletsNeeded, 0);
    
    return {
      orderItems,
      unknownItems,
      requiresAdditionalInfo: unknownItems.length > 0,
      totalPallets,
      summary: {
        totalItems: orderItems.length + unknownItems.length,
        knownItems: orderItems.length,
        unknownItems: unknownItems.length,
        totalPallets
      }
    };
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }
      
      const orderData = await processCSV(file);
      onFileAccepted(orderData);
    } catch (err) {
      setError(err.message);
    }
  }, [onFileAccepted]);

  const handleFileInput = async (e) => {
    setError(null);
    const file = e.target.files[0];
    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }
      
      const orderData = await processCSV(file);
      onFileAccepted(orderData);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          w-full max-w-md p-8 rounded-lg border-2 border-dashed
          transition-colors duration-200 ease-in-out
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Upload your order CSV file
            </p>
            <p className="text-xs text-muted-foreground">
              File should contain Item numbers and Quantities
            </p>
          </div>
          <input
            type="file"
            onChange={handleFileInput}
            accept=".csv"
            className="hidden"
            id="file-upload"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload').click()}
          >
            <FileText className="w-4 h-4 mr-2" />
            Select File
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center text-destructive gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
} 