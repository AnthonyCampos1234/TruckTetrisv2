"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRight, Menu, MessageSquare, Plus, User } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { itemMaster } from "@/data/itemMaster";

const TRUCK_DIMENSIONS = {
  length: {
    feet: 52,
    inches: 7,
    totalInches: (52 * 12) + 7
  },
  width: {
    inches: 100
  },
  height: {
    inches: 110
  },
  tailSpaceRequired: {
    inches: 10
  },
  usableLength: {
    inches: ((52 * 12) + 7) - 10 // Total length minus required tail space
  }
};

export default function Home() {
  const [conversations, setConversations] = useState([
    {
      id: 1,
      title: "Loading Plan #1",
      messages: []
    }
  ]);
  const [activeConversation, setActiveConversation] = useState(1);
  const [input, setInput] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [orderState, setOrderState] = useState({
    stage: 'upload',
    unknownItems: [],
    knownItems: [],
    requirements: [],
    truckCount: 0,
    loadingPlans: []
  });
  
  const messagesEndRef = useRef(null);
  
  const currentConversation = conversations.find(conv => conv.id === activeConversation);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (currentConversation?.messages?.length > 0) {
      scrollToBottom();
    }
  }, [currentConversation?.messages]);

  const adjustTextareaHeight = (element) => {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 200) + 'px';
  };

  const handleFileAccepted = async (data) => {
    setOrderData(data);
    setFileUploaded(true);
    
    if (data.requiresAdditionalInfo) {
      setOrderState(prev => ({
        ...prev,
        stage: 'missing-items',
        unknownItems: data.unknownItems,
        knownItems: data.orderItems
      }));

      // Format the unknown items list with descriptions
      const unknownItemsList = data.unknownItems
        .map(item => (
          `• Item ID: ${item.itemId}\n` +
          `  Quantity: ${item.quantity}\n` +
          `  Description: ${item.description || 'N/A'}\n`
        )).join('\n');

      // Add message requesting only dimensional information
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [
                ...conv.messages,
                {
                  role: "bot",
                  content: 
                    `I've analyzed your order and found ${data.unknownItems.length} items that need dimensional information:\n\n` +
                    `${unknownItemsList}\n` +
                    `For each item above, please provide the dimensions:\n` +
                    `1. Length (in inches)\n` +
                    `2. Width (in inches)\n` +
                    `3. Height (in inches)\n\n` +
                    `Please provide the dimensions for one item at a time, starting with ${data.unknownItems[0].itemId}.`
                }
              ]
            };
          }
          return conv;
        })
      );
    } else {
      setOrderState(prev => ({
        ...prev,
        stage: 'requirements',
        knownItems: data.orderItems
      }));

      // Proceed to requirements gathering
      promptForRequirements(data);
    }
  };

  const promptForRequirements = (data) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                role: "bot",
                content: `I've processed your order with ${data.orderItems.length} different items totaling ${data.totalPallets} pallets.\n\n` +
                  `Before we proceed with the loading plan, please specify any requirements:\n\n` +
                  `• Items that need to be placed together\n` +
                  `• Items that must be loaded first/last\n` +
                  `• Items with specific placement needs due to overhang\n` +
                  `• Any other special handling requirements\n\n` +
                  `Please list your requirements, or type "no requirements" to continue.`
              }
            ]
          };
        }
        return conv;
      })
    );
  };

  const promptForTruckCount = () => {
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                role: "bot",
                content: `How many trucks have been assigned to this order? ` +
                  `(The order requires space for ${orderData.totalPallets} pallets total)`
              }
            ]
          };
        }
        return conv;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: "user", content: input };
    setInput("");
    setIsLoading(true);

    // Update UI with user message
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...conv.messages, userMessage]
          };
        }
        return conv;
      })
    );

    try {
      // Get current conversation history
      const currentMessages = conversations
        .find(conv => conv.id === activeConversation)
        ?.messages || [];

      // Send to Claude API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...currentMessages, userMessage],
          orderState, // Include current state
          orderData   // Include order data
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const botMessage = await response.json();

      // Update conversation with bot response
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [...conv.messages, botMessage]
            };
          }
          return conv;
        })
      );

      // Update orderState based on Claude's response if included
      if (botMessage.stateUpdate) {
        setOrderState(prev => ({
          ...prev,
          ...botMessage.stateUpdate
        }));
      }

    } catch (error) {
      console.error('Error:', error);
      setConversations(prevConversations =>
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [
                ...conv.messages,
                { 
                  role: 'bot', 
                  content: 'Sorry, I encountered an error processing your request. Please try again.'
                }
              ]
            };
          }
          return conv;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const Sidebar = ({ className = "" }) => (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Sidebar Header */}
      <div className="h-14">
        <div className="px-4 h-full flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-primary"
            >
              <rect x="3" y="8" width="18" height="12" rx="2" />
              <path d="M7 8v4" />
              <path d="M17 8v4" />
              <path d="M21 12H3" />
            </svg>
          </div>
          <h1 className="font-medium">TruckTetris</h1>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-auto p-2">
        <Button 
          variant="secondary"
          size="sm"
          className="w-full justify-start gap-2 mb-2" 
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="space-y-0.5">
          {conversations.map((conv) => (
            <Button
              key={conv.id}
              variant={conv.id === activeConversation ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setActiveConversation(conv.id)}
            >
              <MessageSquare className="h-4 w-4" />
              {conv.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="h-14">
        <div className="px-2 h-full flex items-center">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">JD</span>
            </div>
            <>
              <span className="flex-1 text-sm">John Doe</span>
              <span className="text-xs text-muted-foreground">Premium</span>
            </>
          </Button>
        </div>
      </div>
    </div>
  );

  const handleNewChat = () => {
    const newId = conversations.length + 1;
    const newConversation = {
      id: newId,
      title: `Loading Plan #${newId}`,
      messages: []
    };
    setConversations([...conversations, newConversation]);
    setActiveConversation(newId);
    setFileUploaded(false);
    setOrderData(null);
    setOrderState({
      stage: 'upload',
      unknownItems: [],
      knownItems: [],
      requirements: [],
      truckCount: 0,
      loadingPlans: []
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - fixed width */}
      <div className="hidden md:flex flex-col w-[260px] border-r border-border/50 bg-muted/50">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 h-8 w-8 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] bg-muted/50">
          <Sidebar className="h-full" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pt-8">
          {!currentConversation?.messages.length && !fileUploaded ? (
            <div className="h-full flex items-center justify-center p-4">
              <FileUpload onFileAccepted={handleFileAccepted} />
            </div>
          ) : currentConversation?.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Start describing how you'd like to load the truck</p>
            </div>
          ) : (
            <>
              {currentConversation?.messages.map((message, index) => (
                <div
                  key={index}
                  className="py-2"
                  ref={index === currentConversation.messages.length - 1 ? messagesEndRef : null}
                >
                  <div className="max-w-3xl mx-auto px-4">
                    <div className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="h-7 w-7 shrink-0 self-end">
                        {message.role === "bot" ? (
                          <div className="h-full w-full rounded-md bg-primary/10 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 text-primary"
                            >
                              <rect x="3" y="8" width="18" height="12" rx="2" />
                              <path d="M7 8v4" />
                              <path d="M17 8v4" />
                              <path d="M21 12H3" />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-full w-full rounded-md bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">JD</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} max-w-[85%]`}>
                        <div 
                          className={`
                            inline-block text-sm px-4 py-2.5 rounded-2xl whitespace-pre-wrap
                            ${message.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-br-none" 
                              : "bg-muted rounded-bl-none"
                            }
                          `}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50">
          <div className="max-w-3xl mx-auto p-4">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                  // Adjust height on Enter key press with Shift
                  if (e.key === 'Enter' && e.shiftKey) {
                    setTimeout(() => adjustTextareaHeight(e.target), 0);
                  }
                }}
                placeholder={
                  !fileUploaded 
                    ? "Please upload a CSV file first..." 
                    : isLoading
                    ? "Waiting for response..."
                    : "Describe your truck loading needs..."
                }
                disabled={!fileUploaded || isLoading}
                rows={1}
                className="w-full px-3 pr-10 rounded-md border border-border/50 bg-muted/50 
                           focus:outline-none focus:ring-1 focus:ring-ring focus:border-input 
                           transition-all text-sm disabled:opacity-50 resize-none min-h-[40px] py-2"
                style={{
                  overflowY: 'auto',
                  maxHeight: '200px'
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                disabled={!fileUploaded || isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
