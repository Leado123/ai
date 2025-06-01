import { initTRPC } from '@trpc/server';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import express from "express";
import cors from "cors";
import { Server } from "@grpc/grpc-js"
import ollama from "ollama";
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { WebSocketServer } from "ws"
import { createOllama } from "ollama-ai-provider";
import { generateText, streamText } from 'ai';
import { observable } from '@trpc/server/observable';
import z from "zod";
import { LanguageModelV1 } from '@ai-sdk/provider';

const t = initTRPC.create();
